'use client'
// app/(store)/products/[slug]/ProductDetail.tsx
import Link from 'next/link'
import { useState } from 'react'
import { Plus, Minus, ShoppingCart, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem, removeItem, updateQuantity, getItem, openCart } = useCartStore()
  const [adding, setAdding] = useState(false)

  const cartItem = getItem(product.id)
  const qty      = cartItem?.quantity ?? 0

  const discountPct = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : null

  const stockStatus =
    product.stock_qty === 0               ? 'out'
    : product.stock_qty <= product.low_stock_threshold ? 'low'
    : 'ok'

  const handleAdd = async () => {
    if (stockStatus === 'out') { toast.error('Out of stock'); return }
    setAdding(true)
    addItem(product)
    toast.success(`${product.emoji || '🛒'} Added to cart`)
    setTimeout(() => setAdding(false), 300)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-green-deep transition-colors">Home</Link>
        <ChevronRight size={13} />
        <Link href="/shop" className="hover:text-green-deep transition-colors">Shop</Link>
        {product.category && (
          <>
            <ChevronRight size={13} />
            <span className="text-green-deep font-medium">{product.category.name}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image / Emoji */}
        <div className="bg-cream rounded-3xl flex items-center justify-center min-h-[320px] relative">
          {product.badge && (
            <div className="absolute top-4 left-4">
              <span className={`badge-${product.badge}`}>
                {product.badge === 'sale' && discountPct ? `${discountPct}% off` : product.badge}
              </span>
            </div>
          )}
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="w-52 h-52 object-contain" />
          ) : (
            <span className="text-[120px] select-none" role="img" aria-label={product.name}>
              {product.emoji || '📦'}
            </span>
          )}
          {stockStatus === 'out' && (
            <div className="absolute inset-0 bg-white/60 rounded-3xl flex items-center justify-center">
              <span className="bg-white border text-sm font-semibold text-gray-500 px-4 py-2 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {/* Category + brand */}
          <div className="flex items-center gap-2 mb-2">
            {product.category && (
              <span className="text-xs font-semibold text-green-muted uppercase tracking-wide">
                {product.category.emoji} {product.category.name}
              </span>
            )}
            {product.brand && (
              <span className="text-xs text-gray-400">• {product.brand}</span>
            )}
          </div>

          <h1 className="font-display font-extrabold text-3xl text-green-deep leading-tight mb-2">
            {product.name}
          </h1>
          {product.weight && (
            <p className="text-sm text-gray-400 mb-4">{product.weight}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-display font-extrabold text-4xl text-green-deep">₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through">₹{product.mrp}</span>
                <span className="badge-sale">{discountPct}% off</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-6">Inclusive of all taxes</p>

          {/* Stock status */}
          <div className="mb-6">
            {stockStatus === 'ok'  && <span className="text-sm font-semibold text-green-600">✓ In Stock</span>}
            {stockStatus === 'low' && <span className="text-sm font-semibold text-orange-500">⚠ Only {product.stock_qty} left</span>}
            {stockStatus === 'out' && <span className="text-sm font-semibold text-red-500">✗ Out of Stock</span>}
          </div>

          {/* Cart control */}
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={stockStatus === 'out'}
              className={`btn-primary text-base py-4 justify-center
                ${adding ? 'scale-95' : ''}
                disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <ShoppingCart size={18} /> Add to Cart
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-cream rounded-full px-2 py-1.5">
                <button
                  onClick={() => qty === 1 ? removeItem(product.id) : updateQuantity(product.id, qty - 1)}
                  className="w-9 h-9 rounded-full border-2 border-green-deep text-green-deep flex items-center justify-center hover:bg-green-deep hover:text-white transition-all"
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>
                <span className="font-display font-bold text-xl text-green-deep min-w-[24px] text-center">{qty}</span>
                <button
                  onClick={() => {
                    if (qty >= product.stock_qty) { toast.error('Max stock reached'); return }
                    updateQuantity(product.id, qty + 1)
                  }}
                  className="w-9 h-9 rounded-full bg-green-deep text-white flex items-center justify-center hover:bg-green-light transition-all"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
              <button
                onClick={openCart}
                className="flex-1 btn-primary justify-center py-3"
              >
                <ShoppingCart size={16} /> View Cart
              </button>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-8 pt-6 border-t border-cream-dark">
              <h3 className="font-display font-bold text-green-deep mb-2">About this product</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
