// app/api/profile/route.ts — Authenticated user profile update
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

const patchSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email:     z.string().email().max(200).optional().or(z.literal('')),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const update: Record<string, string | null> = {}
  if ('full_name' in parsed.data) update.full_name = parsed.data.full_name?.trim() || null
  if ('email'     in parsed.data) update.email     = parsed.data.email?.trim()     || null

  if (Object.keys(update).length === 0) return apiError('Nothing to update')

  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return apiError(error.message || 'Failed to update profile')

  return apiSuccess({ updated: update })
}
