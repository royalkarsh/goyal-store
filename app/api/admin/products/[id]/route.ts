// app/api/admin/products/[id]/route.ts
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  apiSuccess, apiError, apiUnauthorized, apiNotFound,
  productSchema,
} from '@/lib/security'

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
    .from('products')
    .select('*, category:categories(id, name, slug, emoji)')
    .eq('id', id)
    .single()

  if (error || !data) return apiNotFound('Product')
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

  // Allow partial updates
  const parsed = productSchema.partial().safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('products')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(id, name, slug)')
    .single()

  if (error) return apiError(error.message || 'Failed to update product')
  if (!data) return apiNotFound('Product')
  return apiSuccess(data)
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const adminSupabase = await createAdminClient()
  // Soft-delete only — products may have order history
  const { error } = await adminSupabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return apiError('Failed to deactivate product')
  return apiSuccess({ message: 'Product deactivated' })
}
