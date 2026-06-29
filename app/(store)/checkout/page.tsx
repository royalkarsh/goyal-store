'use client'
// app/(store)/checkout/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore, MIN_ORDER_AMOUNT } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { MapPin, Plus, Clock, Check, Trash2 } from 'lucide-react'

// ── Delivery slot generation (IST-aware) ──────────────────────────────────────
const SLOT_TIMES = [
  { label: '10am – 12pm', start: 10 },
  { label: '12pm – 3pm',  start: 12 },
  { label: '3pm – 6pm',   start: 15 },
  { label: '6pm – 9pm',   start: 18 },
]

function generateSlots(): { day: string; slots: string[] }[] {
  const IST    = 5.5 * 3_600_000
  const nowIST = new Date(Date.now() + IST)
  const hour   = nowIST.getUTCHours() + nowIST.getUTCMinutes() / 60

  const result: { day: string; slots: string[] }[] = []

  // Today: only slots at least 2 hrs ahead and store closes at 9pm
  const todaySlots = SLOT_TIMES.filter(s => s.start > hour + 2 && hour < 19)
    .map(s => `Today, ${s.label}`)
  if (todaySlots.length) result.push({ day: 'Today', slots: todaySlots })

  // Tomorrow: always all slots
  result.push({ day: 'Tomorrow', slots: SLOT_TIMES.map(s => `Tomorrow, ${s.label}`) })

  return result
}

// ── Form schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  full_name:      z.string().min(2, 'Enter your full name'),
  phone:          z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  line1:          z.string().min(5, 'Enter your street address'),
  line2:          z.string().optional(),
  landmark:       z.string().optional(),
  city:           z.string().min(2, 'Enter your city'),
  pincode:        z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  payment_method: z.enum(['razorpay', 'cod']),
  customer_note:  z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

interface SavedAddress {
  id: string; label: string; line1: string; line2?: string | null
  landmark?: string | null; city: string; pincode: string; is_default: boolean
}

declare global { interface Window { Razorpay: any } }

export default function CheckoutPage() {
  const router = useRouter()
  const { items, coupon, getTotals, clearCart, removeCoupon } = useCartStore()
  const totals = getTotals()

  const [authLoading,    setAuthLoading]    = useState(true)
  const [submitting,     setSubmitting]     = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddrId, setSelectedAddrId] = useState<string | 'new'>('new')
  const [saveNewAddr,    setSaveNewAddr]    = useState(false)
  const [selectedSlot,   setSelectedSlot]  = useState('')
  const [slots]                            = useState(generateSlots)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_method: 'razorpay' },
  })

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user)           { router.push('/login?redirect=/checkout'); return }
      if (items.length === 0) { router.push('/');                      return }

      // Pre-fill contact from profile
      const { data: profile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', user.id).single()
      if (profile?.full_name) setValue('full_name', profile.full_name)
      if (profile?.phone)     setValue('phone', profile.phone.replace(/^\+91/, ''))

      // Load saved addresses
      const addrRes = await fetch('/api/addresses')
      const addrJson = await addrRes.json()
      const addrs: SavedAddress[] = addrJson.data?.addresses || []
      setSavedAddresses(addrs)
      if (addrs.length > 0) {
        const def = addrs.find(a => a.is_default) || addrs[0]
        setSelectedAddrId(def.id)
        fillAddress(def)
      }

      setAuthLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fillAddress = (addr: SavedAddress) => {
    setValue('line1',    addr.line1)
    setValue('line2',    addr.line2 || '')
    setValue('landmark', addr.landmark || '')
    setValue('city',     addr.city)
    setValue('pincode',  addr.pincode)
  }

  const handleSelectAddr = (addr: SavedAddress) => {
    setSelectedAddrId(addr.id)
    fillAddress(addr)
  }

  const deleteAddress = async (id: string) => {
    await fetch(`/api/addresses/${id}`, { method: 'DELETE' })
    const updated = savedAddresses.filter(a => a.id !== id)
    setSavedAddresses(updated)
    if (selectedAddrId === id) {
      if (updated.length > 0) { setSelectedAddrId(updated[0].id); fillAddress(updated[0]) }
      else setSelectedAddrId('new')
    }
    toast.success('Address removed')
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
    if (!selectedSlot) { toast.error('Please select a delivery slot'); return }
    if (totals.subtotal < MIN_ORDER_AMOUNT) {
      toast.error(`Minimum order is ₹${MIN_ORDER_AMOUNT}`)
      return
    }

    setSubmitting(true)

    // Optionally save new address
    if (selectedAddrId === 'new' && saveNewAddr) {
      await fetch('/api/addresses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Home', line1: data.line1, line2: data.line2,
          landmark: data.landmark, city: data.city, pincode: data.pincode,
        }),
      })
    }

    const payload = {
      ...data,
      delivery_slot: selectedSlot,
      coupon_code:   coupon?.code,
      items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
    }

    const res  = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

    const loaded = await loadRazorpay()
    if (!loaded) { toast.error('Could not load payment gateway'); setSubmitting(false); return }

    const options = {
      key:      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount:   Math.round(total * 100),
      currency: 'INR',
      name:     'Goyal General Store',
      description: `Order ${order_number}`,
      order_id: razorpay_order?.id,
      prefill:  { name: data.full_name, contact: data.phone },
      theme:    { color: '#0D2818' },
      handler: async (response: any) => {
        const verifyRes = await fetch('/api/orders/verify-payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const showAddrForm = selectedAddrId === 'new' || savedAddresses.length === 0

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display font-extrabold text-3xl text-green-deep mb-8">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-5">

            {/* ── Contact ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
              <h2 className="font-display font-bold text-green-deep">Contact</h2>
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
              </div>
            </div>

            {/* ── Delivery Address ─────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
              <h2 className="font-display font-bold text-green-deep flex items-center gap-2">
                <MapPin size={16} /> Delivery Address
              </h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  {savedAddresses.map(addr => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors
                        ${selectedAddrId === addr.id ? 'border-green-muted bg-green-50/40' : 'border-cream-dark hover:bg-cream'}`}
                      onClick={() => handleSelectAddr(addr)}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${selectedAddrId === addr.id ? 'border-green-deep bg-green-deep' : 'border-gray-300'}`}>
                        {selectedAddrId === addr.id && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-green-deep uppercase tracking-wide">{addr.label}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}{addr.landmark ? ` · ${addr.landmark}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{addr.city} — {addr.pincode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteAddress(addr.id) }}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </label>
                  ))}

                  {/* Add new option */}
                  <label
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors
                      ${selectedAddrId === 'new' ? 'border-green-muted bg-green-50/40' : 'border-dashed border-cream-dark hover:bg-cream'}`}
                    onClick={() => setSelectedAddrId('new')}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                      ${selectedAddrId === 'new' ? 'border-green-deep bg-green-deep' : 'border-gray-300'}`}>
                      {selectedAddrId === 'new' && <Check size={10} className="text-white" />}
                    </div>
                    <Plus size={14} className="text-green-deep" />
                    <span className="text-sm font-semibold text-green-deep">Add a new address</span>
                  </label>
                </div>
              )}

              {/* Address form (new or first time) */}
              {showAddrForm && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address Line 1 *</label>
                    <input {...register('line1')} className="input-field mt-1" placeholder="House No., Street, Area" />
                    {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveNewAddr}
                      onChange={e => setSaveNewAddr(e.target.checked)}
                      className="w-4 h-4 accent-green-deep"
                    />
                    <span className="text-sm text-green-deep font-medium">Save this address for next time</span>
                  </label>
                </div>
              )}
            </div>

            {/* ── Delivery Slot ────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h2 className="font-display font-bold text-green-deep flex items-center gap-2 mb-4">
                <Clock size={16} /> Delivery Slot
              </h2>
              <div className="space-y-3">
                {slots.map(({ day, slots: daySlots }) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{day}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {daySlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-center
                            ${selectedSlot === slot
                              ? 'border-green-deep bg-green-deep text-white'
                              : 'border-cream-dark text-green-deep hover:bg-cream'}`}
                        >
                          {slot.split(', ')[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!selectedSlot && (
                <p className="text-xs text-gray-400 mt-3">Please select a delivery slot to continue</p>
              )}
            </div>

            {/* ── Coupon (applied) ─────────────────────────────── */}
            {coupon && (
              <div className="bg-white rounded-2xl shadow-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-base">🏷️</span>
                  <div>
                    <p className="text-sm font-bold">{coupon.code} applied</p>
                    <p className="text-xs text-green-600">Saving ₹{totals.discountAmount.toFixed(0)}</p>
                  </div>
                </div>
                <button type="button" onClick={removeCoupon}
                  className="text-xs text-red-500 font-semibold hover:text-red-700 transition-colors">
                  Remove
                </button>
              </div>
            )}

            {/* ── Payment ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h2 className="font-display font-bold text-green-deep mb-3">Payment Method</h2>
              <div className="space-y-2">
                {([
                  { value: 'razorpay', label: '💳 Pay Online', sub: 'UPI, Cards, Net Banking via Razorpay' },
                  { value: 'cod',      label: '💵 Cash on Delivery', sub: 'Pay when your order arrives' },
                ] as const).map(m => (
                  <label key={m.value}
                    className="flex items-start gap-3 p-3 border border-cream-dark rounded-xl cursor-pointer hover:bg-cream transition-colors has-[:checked]:border-green-muted has-[:checked]:bg-green-50/40">
                    <input type="radio" value={m.value} {...register('payment_method')} className="mt-0.5 accent-green-deep" />
                    <div>
                      <p className="text-sm font-semibold text-green-deep">{m.label}</p>
                      <p className="text-xs text-gray-400">{m.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Delivery note ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Note</label>
              <textarea {...register('customer_note')} rows={2} className="input-field mt-1 resize-none"
                placeholder="Any special instructions for delivery…" />
            </div>
          </div>

          {/* ── Order Summary ────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24">
              <h2 className="font-display font-bold text-green-deep mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4 max-h-52 overflow-y-auto scrollbar-hide">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-contain" />
                        : <span className="text-lg">{item.product.emoji || '📦'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-deep truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.product.brand ? `${item.product.brand} · ` : ''}× {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-deep shrink-0">₹{(item.product.price * item.quantity).toFixed(0)}</p>
                  </div>
                ))}
              </div>

              {selectedSlot && (
                <div className="bg-cream rounded-xl px-3 py-2 mb-4 flex items-center gap-2 text-sm text-green-deep">
                  <Clock size={13} className="shrink-0" />
                  <span className="font-medium">{selectedSlot}</span>
                </div>
              )}

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
                disabled={submitting || !selectedSlot || totals.subtotal < MIN_ORDER_AMOUNT}
                className="w-full mt-5 py-4 bg-green-deep text-white font-display font-bold text-base rounded-2xl
                           hover:bg-green-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
