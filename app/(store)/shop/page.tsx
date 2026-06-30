// app/(store)/shop/page.tsx — Full shop / catalogue page
import { createClient } from '@/lib/supabase/server'
import StoreFront from '@/components/store/StoreFront'
import type { Category, Product } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop — Goyal General Store',
  description: 'Browse 500+ grocery products. Fresh dairy, staples, spices, snacks and more. Fast delivery in Rohini, Delhi.',
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search = '' } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
    supabase
      .from('products')
      .select('*, category:categories(id,name,slug,emoji)')
      .eq('is_active', true)
      .order('sort_order')
      .order('is_featured', { ascending: false })
      .limit(24),
  ])

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <h1 className="font-display font-extrabold text-3xl text-green-deep mb-1">Shop</h1>
        <p className="text-gray-500 text-sm">Browse all {(products?.length ?? 0)}+ products</p>
      </div>
      <StoreFront
        categories={(categories as Category[]) || []}
        initialProducts={(products as Product[]) || []}
        initialSearch={search}
      />
    </div>
  )
}
