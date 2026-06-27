// app/api/coupons/validate/route.ts — POST /api/coupons/validate
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiRateLimited, rateLimitByIP } from '@/lib/security'
import { z } from 'zod'

const validateSchema = z.object({
  code:       z.string().min(1).max(20).transform(s => s.toUpperCase()),
  cart_total: z.number().min(0),
})

export async function POST(request: NextRequest) {
  const { allowed } = rateLimitByIP(request, 10, 60_000)
  if (!allowed) return apiRateLimited()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = validateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid input')

  const { code, cart_total } = parsed.data

  const supabase = await createClient()
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (error || !coupon) return apiError('Invalid or expired coupon code')

  const now = new Date()
  if (new Date(coupon.valid_from) > now)
    return apiError('Coupon is not yet active')
  if (coupon.valid_until && new Date(coupon.valid_until) < now)
    return apiError('Coupon has expired')
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)
    return apiError('Coupon usage limit reached')
  if (cart_total < coupon.min_order_value)
    return apiError(`Minimum order value ₹${coupon.min_order_value} required for this coupon`)

  let discountAmount = 0
  if (coupon.discount_type === 'percent') {
    discountAmount = (cart_total * coupon.discount_value) / 100
    if (coupon.max_discount) discountAmount = Math.min(discountAmount, coupon.max_discount)
  } else {
    discountAmount = Math.min(coupon.discount_value, cart_total)
  }
  discountAmount = +discountAmount.toFixed(2)

  return apiSuccess({
    coupon,
    discount_amount: discountAmount,
    message: coupon.description || `₹${discountAmount} discount applied!`,
  })
}
