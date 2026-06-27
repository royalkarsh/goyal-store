'use client'
// app/(admin)/admin/products/page.tsx
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product, Category } from '@/types'

export default function AdminProductsPage() {
  const [products, setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search)   params.set('search', search)
    if (category) params.set('category', category)
    const res  = await fetch(`/api/admin/products?${params}`)
    const json = await res.json()
    setProducts(json.data?.products || [])
    setTotal(json.data?.total || 0)
    setLoading(false)
  }, [page, search, category])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then(r => r.json())
      .then(j => {/* categories come from products join */})
    // fetch categories separately
    fetch('/api/admin/products?limit=1')
      .then(r => r.json())
  }, [])

  const toggleActive = async (product: Product) => {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !product.is_active }),
    })
    if (res.ok) {
      toast.success(product.is_active ? 'Product deactivated' : 'Product activated')
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    } else {
      toast.error('Failed to update product')
    }
  }

  const pages = Math.ceil(total / 20)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} products total</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-green-deep text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors"
        >
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field pl-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-cream rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Price</th>
                  <th className="px-5 py-3 text-left">Stock</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {products.map(product => {
                  const lowStock = product.stock_qty <= product.low_stock_threshold && product.stock_qty > 0
                  const outOfStock = product.stock_qty === 0
                  return (
                    <tr key={product.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{product.emoji || '📦'}</span>
                          <div>
                            <p className="text-sm font-semibold text-green-deep">{product.name}</p>
                            {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {(product as any).category?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-green-deep">₹{product.price}</p>
                        {product.mrp && product.mrp > product.price && (
                          <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold flex items-center gap-1
                          ${outOfStock ? 'text-red-600' : lowStock ? 'text-orange-500' : 'text-green-600'}`}>
                          {(outOfStock || lowStock) && <AlertTriangle size={12} />}
                          {product.stock_qty}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full
                          ${product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-1.5 text-green-deep hover:bg-cream rounded-lg transition-colors"
                          >
                            <Edit2 size={15} />
                          </Link>
                          <button
                            onClick={() => toggleActive(product)}
                            className={`p-1.5 rounded-lg transition-colors
                              ${product.is_active
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-50'}`}
                          >
                            {product.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <Package size={36} className="mx-auto mb-3 opacity-30" />
                <p>No products found</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-cream-dark">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-cream-dark rounded-lg disabled:opacity-40 hover:bg-cream transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1.5 text-sm border border-cream-dark rounded-lg disabled:opacity-40 hover:bg-cream transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
