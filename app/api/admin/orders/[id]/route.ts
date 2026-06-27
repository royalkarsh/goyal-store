// app/api/admin/orders/[id]/route.ts
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/security'
import { z } from 'zod'

const VALID_STATUSES = [
  'pending', 'confirmed', 'preparing',
  'out_for_delivery', 'delivered', 'cancelled', 'refunded',
] as const

// Only allow forward-moving transitions (cancelled/refunded can come from anywhere)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['preparing', 'cancelled'],
  preparing:        ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered:        ['refunded'],
  cancelled:        [],
  refunded:         [],
}

const patchSchema = z.object({
  status:     z.enum(VALID_STATUSES).optional(),
  admin_note: z.string().max(500).optional(),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('orders')
    .select(`*, items:order_items(*, product:products(name, emoji)), profile:profiles(full_name, phone, email)`)
    .eq('id', id)
    .single()

  if (error || !data) return apiNotFound('Order')
  return apiSuccess(data)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const adminSupabase = await createAdminClient()

  if (parsed.data.status) {
    const { data: order } = await adminSupabase
      .from('orders').select('status').eq('id', id).single()
    if (!order) return apiNotFound('Order')

    const allowed = ALLOWED_TRANSITIONS[order.status] || []
    if (!allowed.includes(parsed.data.status)) {
      return apiError(`Cannot transition from "${order.status}" to "${parsed.data.status}"`)
    }
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.status)     updateData.status     = parsed.data.status
  if (parsed.data.admin_note !== undefined) updateData.admin_note = parsed.data.admin_note

  // Track timestamps
  if (parsed.data.status === 'delivered')  updateData.delivered_at  = new Date().toISOString()
  if (parsed.data.status === 'confirmed')  updateData.confirmed_at  = new Date().toISOString()
  if (parsed.data.status === 'cancelled')  updateData.cancelled_at  = new Date().toISOString()

  const { data, error } = await adminSupabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError('Failed to update order')
  return apiSuccess(data)
}
