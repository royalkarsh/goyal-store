'use client'
// components/store/ProductGrid.tsx
import { useEffect, useState, useCallback } from 'react'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

interface Props {
  initialProducts:  Product[]
  activeCategory?:  string
  activeSubcategory?: string
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-card animate-pulse">
      <div className="h-40 bg-cream" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-cream rounded w-1/3" />
        <div className="h-4 bg-cream rounded w-4/5" />
        <div className="h-3 bg-cream rounded w-1/4" />
        <div className="flex justify-between mt-3">
          <div className="h-6 bg-cream rounded w-16" />
          <div className="h-9 w-9 bg-cream rounded-full" />
        </div>
      </div>
    </div>
  )
}

export default function ProductGrid({
  initialProducts,
  activeCategory    = 'all',
  activeSubcategory = '',
}: Props) {
  const [products,    setProducts]    = useState<Product[]>(initialProducts)
  const [loading,     setLoading]     = useState(false)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(initialProducts.length >= 24)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchProducts = useCallback(async (cat: string, subcat: string, pg: number) => {
    if (pg === 1) setLoading(true)
    else setLoadingMore(true)

    const params = new URLSearchParams({ page: String(pg), limit: '24' })
    // Subcategory takes priority; fall back to category
    if (subcat)               params.set('subcategory', subcat)
    else if (cat !== 'all')   params.set('category', cat)

    const res  = await fetch(`/api/products?${params}`)
    const json = await res.json()
    const next: Product[] = json.data?.products || []

    if (pg === 1) setProducts(next)
    else setProducts(prev => [...prev, ...next])

    setHasMore(next.length === 24)
    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    setPage(1)
    const isDefault = activeCategory === 'all' && !activeSubcategory
    if (isDefault) {
      setProducts(initialProducts)
      setHasMore(initialProducts.length >= 24)
    } else {
      fetchProducts(activeCategory, activeSubcategory, 1)
    }
  }, [activeCategory, activeSubcategory, initialProducts, fetchProducts])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchProducts(activeCategory, activeSubcategory, next)
  }

  return (
    <section id="products" className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="section-label">Our Products</p>
          <h2 className="section-title mb-0">
            {activeCategory === 'all' ? 'Everything You Need' : 'Products'}
          </h2>
        </div>
        {products.length > 0 && (
          <p className="text-sm text-gray-400 mb-2">{products.length} items</p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-5xl mb-4">🛒</p>
          <p className="font-display font-bold text-xl text-green-deep mb-2">No products found</p>
          <p className="text-gray-400 text-sm">Try a different category</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 border-2 border-green-deep text-green-deep font-semibold px-8 py-3 rounded-full
                           hover:bg-green-deep hover:text-white transition-all duration-200 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more products'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
