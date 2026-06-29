'use client'
// components/store/CartDrawer.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ShoppingBag, Minus, Plus, Trash2, Tag } from 'lucide-react'
import { useCartStore, MIN_ORDER_AMOUNT } from '@/lib/store/cart'
import toast from 'react-hot-toast'
import type { Coupon } from '@/types'

const FREE_DELIVERY_ABOVE = 1000

export default function CartDrawer() {
  const {
    isOpen, closeCart, items, removeItem, updateQuantity,
    coupon, applyCoupon, removeCoupon, getTotals, getItemCount,
  } = useCartStore()

  const totals = getTotals()
  const count  = getItemCount()

  const [couponInput,   setCouponInput]   = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const applyCouponCode = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    try {
      const res  = await fetch('/api/coupons/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: couponInput.trim().toUpperCase(), cart_total: totals.subtotal }),
      })
      const json = await res.json()
      if (res.ok) {
        applyCoupon(json.data.coupon as Coupon)
        toast.success(json.data.message || 'Coupon applied!')
        setCouponInput('')
      } else {
        toast.error(json.error || 'Invalid coupon')
      }
    } catch {
      toast.error('Could not validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/45 z-50 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50
          flex flex-col shadow-2xl transition-transform duration-400
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ transition: 'transform 0.4s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream-dark">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-green-deep" />
            <h2 className="font-display font-extrabold text-lg text-green-deep">
              Cart
              {count > 0 && (
                <span className="ml-2 text-sm font-bold bg-green-deep text-white rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {count}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 rounded-full bg-cream hover:bg-cream-dark flex items-center justify-center transition-colors"
            aria-label="Close cart"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center pb-16">
              <span className="text-6xl">🛍️</span>
              <p className="font-semibold text-base text-green-deep">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add products to get started</p>
              <button
                onClick={closeCart}
                className="mt-2 text-sm font-semibold text-green-light underline underline-offset-2"
              >
                Continue shopping →
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-3 py-3 border-b border-cream-dark last:border-0">
                  {/* Product image or emoji */}
                  <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl">{product.emoji || '📦'}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-deep truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[product.brand, product.weight, `₹${product.price} each`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Qty + remove */}
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-display text-base font-extrabold text-green-deep">
                      ₹{(product.price * quantity).toFixed(0)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (quantity === 1) removeItem(product.id)
                          else updateQuantity(product.id, quantity - 1)
                        }}
                        className="w-6 h-6 rounded-full border border-cream-dark flex items-center justify-center hover:bg-cream transition-colors"
                        aria-label="Decrease"
                      >
                        {quantity === 1
                          ? <Trash2 size={10} className="text-red-fresh" />
                          : <Minus size={10} />
                        }
                      </button>
                      <span className="text-xs font-bold min-w-[16px] text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="w-6 h-6 rounded-full bg-green-deep text-white flex items-center justify-center hover:bg-green-light transition-colors"
                        aria-label="Increase"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="bg-cream px-6 py-5 border-t border-cream-dark space-y-3">
            {/* Free delivery progress */}
            {!totals.isFreeDelivery && (
              <div className="text-xs text-gray-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>Add ₹{(FREE_DELIVERY_ABOVE - totals.subtotal).toFixed(0)} more for free delivery</span>
                  <span className="text-green-muted font-medium">{Math.round((totals.subtotal / FREE_DELIVERY_ABOVE) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-muted rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totals.subtotal / FREE_DELIVERY_ABOVE) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Coupon input / applied state */}
            {coupon ? (
              <div className="flex items-center justify-between bg-green-muted/10 border border-green-muted/30 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 text-green-light">
                  <Tag size={13} />
                  <div>
                    <p className="text-xs font-bold">{coupon.code} applied!</p>
                    <p className="text-xs text-green-600">You save ₹{totals.discountAmount.toFixed(0)}</p>
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-gray-400 hover:text-red-fresh transition-colors"
                  aria-label="Remove coupon"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyCouponCode()}
                    placeholder="Coupon code"
                    maxLength={20}
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-cream-dark rounded-xl bg-white
                               focus:outline-none focus:border-green-muted focus:ring-1 focus:ring-green-muted/30
                               placeholder:text-gray-400 text-green-deep transition-colors"
                  />
                </div>
                <button
                  onClick={applyCouponCode}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-4 py-2.5 bg-green-deep text-white rounded-xl text-sm font-semibold
                             hover:bg-green-mid transition-colors disabled:opacity-40"
                >
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{totals.subtotal.toFixed(0)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-light font-medium">
                  <span>Discount</span>
                  <span>−₹{totals.discountAmount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span className={totals.isFreeDelivery ? 'text-green-muted font-medium' : ''}>
                  {totals.isFreeDelivery ? 'FREE 🎉' : `₹${totals.deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Taxes</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between font-display font-extrabold text-green-deep text-lg pt-2 border-t border-cream-dark">
                <span>Total</span>
                <span>₹{totals.total.toFixed(0)}</span>
              </div>
            </div>

            {/* Minimum order warning */}
            {totals.subtotal < MIN_ORDER_AMOUNT && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-center">
                <p className="text-xs font-semibold text-orange-700">
                  Minimum order is ₹{MIN_ORDER_AMOUNT}
                </p>
                <p className="text-xs text-orange-500 mt-0.5">
                  Add ₹{(MIN_ORDER_AMOUNT - totals.subtotal).toFixed(0)} more to place your order
                </p>
              </div>
            )}

            {/* Checkout CTA */}
            {totals.subtotal >= MIN_ORDER_AMOUNT ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full bg-green-deep text-white text-center rounded-full py-4 text-sm font-semibold
                           hover:bg-green-mid active:scale-98 transition-all duration-200
                           shadow-lg hover:shadow-xl"
              >
                Proceed to Checkout →
              </Link>
            ) : (
              <button
                disabled
                className="w-full bg-gray-200 text-gray-400 rounded-full py-4 text-sm font-semibold cursor-not-allowed"
              >
                Proceed to Checkout →
              </button>
            )}
            <p className="text-center text-xs text-gray-400">
              🚀 Free delivery on orders above ₹{FREE_DELIVERY_ABOVE}
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
