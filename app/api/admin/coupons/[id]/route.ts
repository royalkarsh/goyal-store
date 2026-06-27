// app/api/admin/coupons/[id]/route.ts
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

const patchSchema = z.object({
  code:            z.string().min(2).max(50).toUpperCase().optional(),
  description:     z.string().max(500).nullable().optional(),
  discount_type:   z.enum(['percent', 'flat']).optional(),
  discount_value:  z.number().min(0.01).max(100000).optional(),
  min_order_value: z.number().min(0).optional(),
  max_discount:    z.number().min(0).nullable().optional(),
  usage_limit:     z.number().int().min(1).nullable().optional(),
  valid_from:      z.string().optional(),
  valid_until:     z.string().nullable().optional(),
  is_active:       z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { id } = await params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('coupons')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Coupon code already exists', 409)
    console.error('Coupon update error:', error)
    return apiError('Failed to update coupon')
  }

  return apiSuccess({ coupon: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { id } = await params
  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase
    .from('coupons')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Coupon delete error:', error)
    return apiError('Failed to delete coupon')
  }

  return apiSuccess({ message: 'Coupon deleted' })
}
