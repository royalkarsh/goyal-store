'use client'
// app/(admin)/admin/products/page.tsx
import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, AlertTriangle, Package, ScanLine, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product, Category } from '@/types'
import BarcodeScanner, { type BarcodeProductData } from '@/components/admin/BarcodeScanner'

// ── Quick-add modal shown after a successful barcode scan ──────────────────────
function QuickAddModal({
  data, categories, onClose, onSaved,
}: {
  data: BarcodeProductData
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [saving, setSaving] = useState(false)

  const cat = categories.find(c => (c as any).slug === data.category_slug)

  const handleSave = async () => {
    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      toast.error('Enter a valid selling price')
      return
    }
    if (!cat) {
      toast.error(`Category "${data.category_slug}" not found — add product manually`)
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:                data.name || 'Unknown Product',
        brand:               data.brand  || undefined,
        weight:              data.weight || undefined,
        category_id:         cat.id,
        emoji:               data.emoji,
        image_url:           data.image_url,
        barcode:             data.barcode || undefined,
        price:               priceNum,
        unit:                'pcs',
        tax_rate:            0,
        stock_qty:           parseInt(stock) || 0,
        low_stock_threshold: 5,
        is_active:           true,
        is_featured:         false,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success(`${data.name || 'Product'} added!`)
      onSaved()
    } else {
      toast.error(json.error || 'Failed to add product')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-dark">
          <p className="font-display font-bold text-green-deep">
            {data.from_db ? 'Already in Catalog' : 'Quick Add Product'}
          </p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-deep rounded-xl hover:bg-cream transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Product preview */}
          <div className="flex gap-3 bg-cream rounded-2xl p-3">
            {data.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.image_url} alt={data.name || ''} className="w-14 h-14 object-contain rounded-xl bg-white shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-2xl shrink-0">{data.emoji}</div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-deep leading-snug">{data.name || <span className="text-gray-400 italic">Unknown name</span>}</p>
              {data.brand  && <p className="text-xs text-gray-500 mt-0.5">{data.brand}</p>}
              {data.weight && <p className="text-xs text-gray-400">{data.weight}</p>}
              <p className="text-xs font-mono text-gray-400 mt-0.5">{data.barcode}</p>
              {data.from_db ? (
                <span className="inline-block mt-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">✓ Already in your catalog</span>
              ) : cat ? (
                <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{cat.emoji} {cat.name}</span>
              ) : (
                <span className="inline-block mt-1 bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">Category not matched</span>
              )}
            </div>
          </div>

          {data.from_db ? (
            /* Product already exists — offer to go edit it */
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-3 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors">
                Close
              </button>
              <a
                href={`/admin/products/${data.product_id}/edit`}
                className="flex-1 py-3 bg-green-deep text-white rounded-xl text-sm font-bold hover:bg-green-mid transition-colors text-center"
              >
                Edit Product
              </a>
            </div>
          ) : (
            <>
              {/* Price + stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Price (₹) *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="0.00"
                    className="input-field mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock Qty</label>
                  <input
                    type="number" min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-3 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-green-deep text-white rounded-xl text-sm font-bold hover:bg-green-mid transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Product'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Inner page (needs Suspense for useSearchParams) ───────────────────────────
function AdminProductsInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [products,    setProducts]    = useState<Product[]>([])
  const [categories,  setCategories]  = useState<Category[]>([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(() => Math.max(1, Number(searchParams.get('page') || 1)))
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [quickAddData,setQuickAddData]= useState<BarcodeProductData | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    const res  = await fetch(`/api/admin/products?${params}`)
    const json = await res.json()
    setProducts(json.data?.products || [])
    setTotal(json.data?.total || 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(j => setCategories((j.data?.categories || []).filter((c: Category) => c.is_active)))
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

  const onBarcodeFound = (data: BarcodeProductData) => {
    setShowScanner(false)
    setQuickAddData(data)
  }

  const pages = Math.ceil(total / 20)

  return (
    <div>
      {/* Barcode scanner modal */}
      {showScanner && (
        <BarcodeScanner
          onFound={onBarcodeFound}
          onClose={() => setShowScanner(false)}
          onFillManually={(barcode) => { setShowScanner(false); router.push(`/admin/products/new${barcode ? `?barcode=${barcode}` : ''}`) }}
        />
      )}

      {/* Quick-add modal after scan */}
      {quickAddData && (
        <QuickAddModal
          data={quickAddData}
          categories={categories}
          onClose={() => setQuickAddData(null)}
          onSaved={() => { setQuickAddData(null); fetchProducts() }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} products total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 bg-saffron text-green-deep px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <ScanLine size={16} /> Quick Scan
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-green-deep text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors"
          >
            <Plus size={16} /> Add Product
          </Link>
        </div>
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
                  <th className="px-5 py-3 text-left hidden lg:table-cell">Barcode</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {products.map(product => {
                  const lowStock  = product.stock_qty <= product.low_stock_threshold && product.stock_qty > 0
                  const outOfStock = product.stock_qty === 0
                  return (
                    <tr key={product.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center shrink-0 overflow-hidden">
                            {product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xl">{product.emoji || '📦'}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-deep">{product.name}</p>
                            {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-600">{(product as any).category?.name || '—'}</p>
                        {(product as any).subcategory?.name && (
                          <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
                            <ChevronRight size={10} className="shrink-0" />
                            {(product as any).subcategory.name}
                          </p>
                        )}
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
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {(product as any).barcode ? (
                          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                            {(product as any).barcode}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full
                          ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit?from=${page}`}
                            className="p-1.5 text-green-deep hover:bg-cream rounded-lg transition-colors"
                          >
                            <Edit2 size={15} />
                          </Link>
                          <button
                            onClick={() => toggleActive(product)}
                            className={`p-1.5 rounded-lg transition-colors
                              ${product.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
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

// ── Default export wraps in Suspense (required for useSearchParams) ────────────
export default function AdminProductsPage() {
  return (
    <Suspense>
      <AdminProductsInner />
    </Suspense>
  )
}
