// app/api/admin/coupons/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

const couponSchema = z.object({
  code:            z.string().min(2).max(50).toUpperCase(),
  description:     z.string().max(500).optional().nullable(),
  discount_type:   z.enum(['percent', 'flat']),
  discount_value:  z.number().min(0.01).max(100000),
  min_order_value: z.number().min(0).default(0),
  max_discount:    z.number().min(0).optional().nullable(),
  usage_limit:     z.number().int().min(1).optional().nullable(),
  valid_from:      z.string(),
  valid_until:     z.string().optional().nullable(),
  is_active:       z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const page  = Math.max(1, Number(searchParams.get('page')  || 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))
  const from  = (page - 1) * limit

  const adminSupabase = await createAdminClient()
  const { data, error, count } = await adminSupabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) {
    console.error('Coupons fetch error:', error)
    return apiError('Failed to fetch coupons')
  }

  return apiSuccess({ coupons: data, total: count, page, limit,
    pages: Math.ceil((count || 0) / limit) })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const body = await request.json()
  const parsed = couponSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422)

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('coupons')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Coupon code already exists', 409)
    console.error('Coupon create error:', error)
    return apiError('Failed to create coupon')
  }

  return apiSuccess({ coupon: data }, 201)
}
