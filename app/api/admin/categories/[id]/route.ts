// app/api/admin/categories/[id]/route.ts
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
  name:          z.string().min(2).max(100).optional(),
  slug:          z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  emoji:         z.string().max(10).nullable().optional(),
  description:   z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active:     z.boolean().optional(),
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
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422)

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('categories')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Category name or slug already exists', 409)
    console.error('Category update error:', error)
    return apiError('Failed to update category')
  }

  return apiSuccess({ category: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { id } = await params
  // Soft delete — set is_active = false so products referencing this category aren't broken
  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Category delete error:', error)
    return apiError('Failed to deactivate category')
  }

  return apiSuccess({ message: 'Category deactivated' })
}
