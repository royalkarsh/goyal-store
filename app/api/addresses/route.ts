// app/api/addresses/route.ts — Saved delivery addresses
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

const addressSchema = z.object({
  label:    z.string().min(1).max(30).default('Home'),
  line1:    z.string().min(5).max(200),
  line2:    z.string().max(200).optional(),
  landmark: z.string().max(100).optional(),
  city:     z.string().min(2).max(100),
  pincode:  z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return apiError('Failed to fetch addresses')
  return apiSuccess({ addresses: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = addressSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const adminSupabase = await createAdminClient()

  // Check if user has any existing addresses
  const { count } = await adminSupabase
    .from('addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isFirst = (count || 0) === 0

  const { data, error } = await adminSupabase
    .from('addresses')
    .insert({ ...parsed.data, user_id: user.id, is_default: isFirst })
    .select()
    .single()

  if (error) return apiError(error.message || 'Failed to save address')
  return apiSuccess(data, 201)
}
