// app/api/orders/verify-payment/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  apiSuccess, apiError, apiUnauthorized,
  verifyRazorpaySignature, rateLimitByIP
} from '@/lib/security'
import { z } from 'zod'

const verifySchema = z.object({
  razorpay_order_id:   z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature:  z.string(),
  order_id:            z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const { allowed } = rateLimitByIP(request, 10, 60_000)
  if (!allowed) return apiError('Too many requests', 429)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid payment data')

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = parsed.data

  // ── Verify signature cryptographically ────────────────────
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  )

  if (!isValid) {
    console.error(`Invalid payment signature for order ${order_id}`)
    return apiError('Payment verification failed. Contact support.', 400)
  }

  // ── Verify order belongs to this user ────────────────────
  const adminSupabase = await createAdminClient()
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, user_id, payment_status, total_amount')
    .eq('id', order_id)
    .single()

  if (!order) return apiError('Order not found', 404)
  if (order.user_id !== user.id) return apiUnauthorized()
  if (order.payment_status === 'paid') {
    return apiSuccess({ message: 'Already processed', order_id })
  }

  // ── Update order as paid ──────────────────────────────────
  const { error } = await adminSupabase
    .from('orders')
    .update({
      status:              'confirmed',
      payment_status:      'paid',
      razorpay_payment_id: razorpay_payment_id,
      razorpay_signature:  razorpay_signature,
      confirmed_at:        new Date().toISOString(),
    })
    .eq('id', order_id)

  if (error) return apiError('Failed to confirm payment')

  return apiSuccess({ message: 'Payment verified', order_id })
}
