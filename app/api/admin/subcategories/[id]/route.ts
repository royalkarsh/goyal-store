// app/api/admin/subcategories/[id]/route.ts — Admin subcategory update
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'
import { z } from 'zod'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

const patchSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  emoji:         z.string().max(10).optional(),
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
  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('subcategories')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError(error.message || 'Failed to update subcategory')
  return apiSuccess(data)
}
