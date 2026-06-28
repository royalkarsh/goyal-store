// lib/store/cart.ts — Zustand cart store
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem, Product, Coupon, CartTotals } from '@/types'

const FREE_DELIVERY_ABOVE = Number(process.env.NEXT_PUBLIC_FREE_DELIVERY_ABOVE || 299)
const DELIVERY_CHARGE = 30
const GST_RATE = 0

interface CartState {
  items: CartItem[]
  coupon: Coupon | null
  isOpen: boolean

  // Actions
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  applyCoupon: (coupon: Coupon) => void
  removeCoupon: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void

  // Computed (called as functions, not state)
  getTotals: () => CartTotals
  getItemCount: () => number
  getItem: (productId: string) => CartItem | undefined
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      isOpen: false,

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find(i => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              )
            }
          }
          return { items: [...state.items, { product, quantity: 1 }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.product.id !== productId)
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          )
        }))
      },

      clearCart: () => set({ items: [], coupon: null }),

      applyCoupon: (coupon) => set({ coupon }),

      removeCoupon: () => set({ coupon: null }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotals: (): CartTotals => {
        const { items, coupon } = get()
        const subtotal = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )

        let discountAmount = 0
        if (coupon && subtotal >= coupon.min_order_value) {
          if (coupon.discount_type === 'percent') {
            discountAmount = (subtotal * coupon.discount_value) / 100
            if (coupon.max_discount) {
              discountAmount = Math.min(discountAmount, coupon.max_discount)
            }
          } else {
            discountAmount = coupon.discount_value
          }
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount)
        const isFreeDelivery = afterDiscount >= FREE_DELIVERY_ABOVE
        const deliveryCharge = isFreeDelivery || items.length === 0 ? 0 : DELIVERY_CHARGE
        const taxAmount = +(afterDiscount * GST_RATE).toFixed(2)
        const total = +(afterDiscount + deliveryCharge + taxAmount).toFixed(2)

        return {
          subtotal: +subtotal.toFixed(2),
          discountAmount: +discountAmount.toFixed(2),
          deliveryCharge,
          taxAmount,
          total,
          isFreeDelivery,
        }
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getItem: (productId) => {
        return get().items.find(i => i.product.id === productId)
      },
    }),
    {
      name: 'goyal-cart',
      storage: createJSONStorage(() => localStorage),
      // Only persist cart items and coupon, not UI state
      partialize: (state) => ({
        items: state.items,
        coupon: state.coupon,
      }),
    }
  )
)
