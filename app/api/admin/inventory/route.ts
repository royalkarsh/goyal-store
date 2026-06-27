// app/api/admin/inventory/route.ts — PATCH /api/admin/inventory
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/security'
import { z } from 'zod'

const updateSchema = z.object({
  product_id: z.string().uuid(),
  new_qty:    z.number().int().min(0).max(100000),
  reason:     z.enum(['restock', 'adjustment', 'return', 'damage']),
  note:       z.string().max(200).optional(),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const lowStock = searchParams.get('low_stock') === 'true'

  const adminSupabase = await createAdminClient()
  let query = adminSupabase
    .from('products')
    .select('id, name, emoji, stock_qty, low_stock_threshold, is_active, category:categories(name)')
    .eq('is_active', true)
    .order('stock_qty', { ascending: true })

  if (lowStock) {
    query = query.lte('stock_qty', 10)
  }

  const { data, error } = await query
  if (error) return apiError('Failed to fetch inventory')
  return apiSuccess({ products: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const { product_id, new_qty, reason, note } = parsed.data
  const adminSupabase = await createAdminClient()

  const { data: product } = await adminSupabase
    .from('products')
    .select('stock_qty, name')
    .eq('id', product_id)
    .single()

  if (!product) return apiNotFound('Product')

  const change_qty = new_qty - product.stock_qty

  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ stock_qty: new_qty, updated_at: new Date().toISOString() })
    .eq('id', product_id)

  if (updateError) return apiError('Failed to update stock')

  await adminSupabase.from('inventory_logs').insert({
    product_id,
    change_qty,
    reason,
    note:       note || null,
    created_by: admin.id,
  })

  return apiSuccess({ product_id, product_name: product.name, new_qty, change_qty })
}
