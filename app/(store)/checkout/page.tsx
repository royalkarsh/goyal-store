'use client'
// app/(store)/checkout/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import type { Coupon } from '@/types'

const schema = z.object({
  full_name:      z.string().min(2, 'Enter your full name'),
  phone:          z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  line1:          z.string().min(5, 'Enter your street address'),
  line2:          z.string().optional(),
  landmark:       z.string().optional(),
  city:           z.string().min(2, 'Enter your city'),
  pincode:        z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  payment_method: z.enum(['razorpay', 'cod']),
  coupon_code:    z.string().optional(),
  customer_note:  z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>

declare global {
  interface Window { Razorpay: any }
}

export default function CheckoutPage() {
  const router                  = useRouter()
  const { items, coupon, getTotals, clearCart, applyCoupon, removeCoupon } = useCartStore()
  const totals                  = getTotals()
  const [authLoading, setAuthLoading] = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_method: 'razorpay' },
  })

  // Guard: redirect if not logged in or cart empty
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/checkout'); return }
      if (items.length === 0) { router.push('/'); return }
      setAuthLoading(false)
    }
    check()
  }, [items.length, router])

  const applyCouponCode = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    const res  = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponInput.trim(), cart_total: totals.subtotal }),
    })
    const json = await res.json()
    if (res.ok) {
      applyCoupon(json.data.coupon as Coupon)
      toast.success(json.data.message || 'Coupon applied!')
    } else {
      toast.error(json.error || 'Invalid coupon')
    }
    setCouponLoading(false)
  }

  const loadRazorpay = () => new Promise<boolean>(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const payload = {
      ...data,
      coupon_code: coupon?.code,
      items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
    }

    const res  = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || 'Failed to place order')
      setSubmitting(false)
      return
    }

    const { order_id, order_number, total, razorpay_order, payment_method } = json.data

    if (payment_method === 'cod') {
      clearCart()
      router.push(`/order-confirmation?order_id=${order_id}&order_number=${order_number}`)
      return
    }

    // Razorpay flow
    const loaded = await loadRazorpay()
    if (!loaded) { toast.error('Could not load payment gateway'); setSubmitting(false); return }

    const options = {
      key:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount:        Math.round(total * 100),
      currency:      'INR',
      name:          'Goyal General Store',
      description:   `Order ${order_number}`,
      order_id:      razorpay_order?.id,
      prefill:       { name: data.full_name, contact: data.phone },
      theme:         { color: '#0D2818' },
      handler: async (response: any) => {
        const verifyRes = await fetch('/api/orders/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            order_id,
          }),
        })
        if (verifyRes.ok) {
          clearCart()
          router.push(`/order-confirmation?order_id=${order_id}&order_number=${order_number}`)
        } else {
          toast.error('Payment verification failed. Contact support.')
        }
      },
      modal: { ondismiss: () => setSubmitting(false) },
    }

    new window.Razorpay(options).open()
  }

  if (authLoading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-green-deep font-display font-bold animate-pulse">Loading…</div>
    </div>
  )

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display font-extrabold text-3xl text-green-deep mb-8">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: delivery + payment */}
          <div className="lg:col-span-3 space-y-5">
            {/* Delivery */}
            <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
              <h2 className="font-display font-bold text-green-deep">Delivery Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name *</label>
                  <input {...register('full_name')} className="input-field mt-1" placeholder="Rajan Goyal" />
                  {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone *</label>
                  <input {...register('phone')} className="input-field mt-1" placeholder="9876543210" maxLength={10} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address Line 1 *</label>
                  <input {...register('line1')} className="input-field mt-1" placeholder="House No., Street, Area" />
                  {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line 2</label>
                  <input {...register('line2')} className="input-field mt-1" placeholder="Apartment, Floor" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Landmark</label>
                  <input {...register('landmark')} className="input-field mt-1" placeholder="Near XYZ" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City *</label>
                  <input {...register('city')} className="input-field mt-1" placeholder="New Delhi" />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode *</label>
                  <input {...register('pincode')} className="input-field mt-1" placeholder="110085" maxLength={6} />
                  {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode.message}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Note</label>
                <textarea {...register('customer_note')} rows={2} className="input-field mt-1 resize-none" placeholder="Any special instructions…" />
              </div>
            </div>

            {/* Coupon */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h2 className="font-display font-bold text-green-deep mb-3">Coupon Code</h2>
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-green-700">{coupon.code} applied!</p>
                    <p className="text-xs text-green-600">You save ₹{totals.discountAmount.toFixed(2)}</p>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-xs text-red-500 font-semibold hover:text-red-700">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    className="input-field flex-1 text-sm"
                    placeholder="Enter coupon code"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={applyCouponCode}
                    disabled={couponLoading}
                    className="px-5 py-3 bg-green-deep text-white rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h2 className="font-display font-bold text-green-deep mb-3">Payment Method</h2>
              <div className="space-y-2">
                {([
                  { value: 'razorpay', label: '💳 Pay Online', sub: 'UPI, Cards, Net Banking via Razorpay' },
                  { value: 'cod',      label: '💵 Cash on Delivery', sub: 'Pay when your order arrives' },
                ] as const).map(m => (
                  <label key={m.value} className="flex items-start gap-3 p-3 border border-cream-dark rounded-xl cursor-pointer hover:bg-cream transition-colors has-[:checked]:border-green-muted has-[:checked]:bg-green-50/40">
                    <input type="radio" value={m.value} {...register('payment_method')} className="mt-0.5 accent-green-deep" />
                    <div>
                      <p className="text-sm font-semibold text-green-deep">{m.label}</p>
                      <p className="text-xs text-gray-400">{m.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24">
              <h2 className="font-display font-bold text-green-deep mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-52 overflow-y-auto scrollbar-hide">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{item.product.emoji || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-deep truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">× {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-green-deep shrink-0">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-cream-dark pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span><span>−₹{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span>{totals.isFreeDelivery ? <span className="text-green-600">Free</span> : `₹${totals.deliveryCharge}`}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxes</span><span>Included in price</span>
                </div>
                <div className="flex justify-between font-display font-extrabold text-lg text-green-deep border-t border-cream-dark pt-3">
                  <span>Total</span><span>₹{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-5 py-4 bg-green-deep text-white font-display font-bold text-base rounded-2xl
                           hover:bg-green-mid transition-colors disabled:opacity-50"
              >
                {submitting ? 'Placing Order…' : `Pay ₹${totals.total.toFixed(2)}`}
              </button>
              <Link href="/shop" className="block text-center text-xs text-gray-400 hover:text-green-deep mt-3 transition-colors">
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
