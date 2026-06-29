// app/api/subcategories/route.ts — Public read-only subcategory list
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/security'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categorySlug = searchParams.get('category')

  const supabase = await createAdminClient()

  let query = supabase
    .from('subcategories')
    .select('*, category:categories(id,name,slug,emoji)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (categorySlug) {
    // Filter by category slug via join
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()
    if (!cat) return apiSuccess({ subcategories: [] })
    query = query.eq('category_id', cat.id)
  }

  const { data, error } = await query
  if (error) return apiError('Failed to fetch subcategories')

  return apiSuccess({ subcategories: data || [] })
}
