// app/api/addresses/[id]/route.ts
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)   // safety: only own addresses

  if (error) return apiError('Failed to delete address')
  return apiSuccess({ deleted: true })
}

export async function PATCH(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const adminSupabase = await createAdminClient()

  // Clear existing default, then set this one
  await adminSupabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', user.id)

  const { error } = await adminSupabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return apiError('Failed to set default')
  return apiSuccess({ default: id })
}
