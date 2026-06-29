// app/api/admin/subcategories/route.ts — Admin subcategory list + create
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

const createSchema = z.object({
  name:          z.string().min(1).max(100),
  slug:          z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  emoji:         z.string().max(10).optional(),
  category_id:   z.string().uuid(),
  display_order: z.number().int().min(0).optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const categorySlug = searchParams.get('category')

  const adminSupabase = await createAdminClient()
  let query = adminSupabase
    .from('subcategories')
    .select('*, category:categories(id,name,slug,emoji)')
    .order('display_order', { ascending: true })

  if (categorySlug) {
    const { data: cat } = await adminSupabase.from('categories').select('id').eq('slug', categorySlug).single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data, error } = await query
  if (error) return apiError('Failed to fetch subcategories')

  return apiSuccess({ subcategories: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('subcategories')
    .insert(parsed.data)
    .select('*, category:categories(id,name,slug,emoji)')
    .single()

  if (error) return apiError(error.message || 'Failed to create subcategory')
  return apiSuccess(data, 201)
}
