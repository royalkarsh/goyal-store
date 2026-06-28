'use client'
// components/store/ProductCard.tsx
import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const { addItem, removeItem, updateQuantity, getItem, openCart } = useCartStore()
  const [adding, setAdding] = useState(false)

  const cartItem = getItem(product.id)
  const qty = cartItem?.quantity ?? 0

  const discountPct = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : null

  const handleAdd = async () => {
    if (product.stock_qty === 0) {
      toast.error('Out of stock')
      return
    }
    setAdding(true)
    addItem(product)
    toast.success(`${product.emoji || '🛒'} ${product.name} added`)
    setTimeout(() => setAdding(false), 300)
  }

  return (
    <article
      className="bg-white rounded-3xl overflow-hidden shadow-card hover:-translate-y-1.5
                 hover:shadow-card-hover transition-all duration-300 flex flex-col"
    >
      {/* Badge */}
      {product.badge && (
        <div className="absolute top-3 left-3 z-10">
          <span className={`badge-${product.badge}`}>
            {product.badge === 'sale' && discountPct ? `${discountPct}% off` : product.badge}
          </span>
        </div>
      )}

      {/* Image / Emoji */}
      <div className="relative bg-cream h-40 flex items-center justify-center overflow-hidden group">
        {product.badge && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`badge-${product.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>
              {product.badge === 'sale' && discountPct ? `${discountPct}% off` :
               product.badge === 'new' ? 'New' :
               product.badge === 'popular' ? '🔥 Popular' : product.badge}
            </span>
          </div>
        )}
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-28 h-28 object-contain group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span
            className="text-6xl group-hover:scale-110 transition-transform duration-300 select-none"
            role="img"
            aria-label={product.name}
          >
            {product.emoji || '📦'}
          </span>
        )}

        {/* Out of stock overlay */}
        {product.stock_qty === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-green-deep leading-snug mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          {[product.brand, product.weight].filter(Boolean).join(' · ')}
        </p>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="font-display text-lg font-extrabold text-green-deep">
              ₹{product.price}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through ml-1.5">₹{product.mrp}</span>
            )}
          </div>

          {/* Add / Qty control */}
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={product.stock_qty === 0}
              className={`w-9 h-9 rounded-full bg-green-deep text-white flex items-center justify-center
                         text-xl font-bold transition-all duration-200
                         ${adding ? 'scale-110 bg-green-light' : 'hover:bg-green-light hover:scale-105 hover:rotate-90'}
                         disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus size={17} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <button
                onClick={() => {
                  if (qty === 1) removeItem(product.id)
                  else updateQuantity(product.id, qty - 1)
                }}
                className="w-7 h-7 rounded-full border-2 border-green-deep text-green-deep flex items-center
                           justify-content hover:bg-green-deep hover:text-white transition-all duration-200"
                aria-label="Decrease quantity"
              >
                <Minus size={13} strokeWidth={2.5} className="mx-auto" />
              </button>
              <span className="text-sm font-bold min-w-[20px] text-center text-green-deep">
                {qty}
              </span>
              <button
                onClick={() => {
                  if (qty >= product.stock_qty) {
                    toast.error('Maximum stock reached')
                    return
                  }
                  updateQuantity(product.id, qty + 1)
                }}
                className="w-7 h-7 rounded-full bg-green-deep text-white flex items-center
                           justify-center hover:bg-green-light transition-all duration-200"
                aria-label="Increase quantity"
              >
                <Plus size={13} strokeWidth={2.5} className="mx-auto" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
