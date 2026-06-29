// app/api/products/route.ts — GET /api/products
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, rateLimitByIP } from '@/lib/security'

export async function GET(request: NextRequest) {
  console.log('Products API called, url:', request.url)

  const { allowed } = rateLimitByIP(request, 60, 60_000)
  if (!allowed) return apiError('Too many requests', 429)

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const featured = searchParams.get('featured')
  const page  = Math.max(1, Number(searchParams.get('page')  || 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))
  const from  = (page - 1) * limit

  const supabase = await createAdminClient() // service role — bypasses RLS for public read

  // Build base query — no join so RLS on products table is the only gate
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .range(from, from + limit - 1)

  if (category && category !== 'all') {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  const subcategory = searchParams.get('subcategory')

  if (search) {
    query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`)
  }

  if (subcategory) {
    const { data: sub } = await supabase
      .from('subcategories')
      .select('id')
      .eq('slug', subcategory)
      .single()
    if (sub) query = query.eq('subcategory_id', sub.id)
  }

  if (featured === 'true') {
    query = query.eq('is_featured', true)
  }

  const { data: products, error, count } = await query

  if (error) {
    console.error('Products fetch error:', JSON.stringify(error))
    return apiError('Failed to fetch products')
  }

  // Fetch categories separately and merge — avoids join syntax issues with RLS
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, emoji')

  const productsWithCategory = (products || []).map(p => ({
    ...p,
    category: categories?.find(c => c.id === p.category_id) || null,
  }))

  return apiSuccess({
    products: productsWithCategory,
    total: count,
    page,
    limit,
    pages: Math.ceil((count || 0) / limit),
  })
}
