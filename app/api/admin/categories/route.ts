// app/api/admin/categories/route.ts
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

const categorySchema = z.object({
  name:          z.string().min(2).max(100),
  slug:          z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens only'),
  emoji:         z.string().max(10).optional().nullable(),
  description:   z.string().max(500).optional().nullable(),
  display_order: z.number().int().min(0).default(0),
  is_active:     z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Categories fetch error:', error)
    return apiError('Failed to fetch categories')
  }

  return apiSuccess({ categories: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const body = await request.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422)

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('categories')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Category name or slug already exists', 409)
    console.error('Category create error:', error)
    return apiError('Failed to create category')
  }

  return apiSuccess({ category: data }, 201)
}
