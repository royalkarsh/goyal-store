// app/api/admin/products/route.ts — Admin product management
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  apiSuccess, apiError, apiUnauthorized,
  rateLimitByIP, productSchema
} from '@/lib/security'

// Verify admin role helper
async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = 20
  const from = (page - 1) * limit
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const lowStock = searchParams.get('low_stock') === 'true'

  const adminSupabase = await createAdminClient()
  let query = adminSupabase
    .from('products')
    .select(`*, category:categories(name, slug), subcategory:subcategories(name, slug)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`)
  if (category) query = query.eq('categories.slug', category)
  if (lowStock) query = query.lte('stock_qty', adminSupabase.rpc('get_low_stock_threshold'))

  const { data, error, count } = await query
  if (error) return apiError('Failed to fetch products')

  return apiSuccess({ products: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const { allowed } = rateLimitByIP(request, 20, 60_000)
  if (!allowed) return apiError('Too many requests', 429)

  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid body') }

  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || 'Invalid data')

  // Generate slug from name
  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100)
    + '-' + Date.now().toString(36)

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('products')
    .insert({ ...parsed.data, slug })
    .select()
    .single()

  if (error) return apiError(error.message || 'Failed to create product')
  return apiSuccess(data, 201)
}
