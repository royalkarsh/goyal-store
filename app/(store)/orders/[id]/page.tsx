// app/(store)/orders/[id]/page.tsx — Full order detail page
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { Order } from '@/types'

type Props = { params: Promise<{ id: string }> }

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  pending:          { label: 'Pending',         color: 'bg-yellow-100 text-yellow-700', step: 0 },
  confirmed:        { label: 'Confirmed',        color: 'bg-blue-100 text-blue-700',    step: 1 },
  preparing:        { label: 'Preparing',        color: 'bg-purple-100 text-purple-700',step: 2 },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-700',step: 3 },
  delivered:        { label: 'Delivered',        color: 'bg-green-100 text-green-700',  step: 4 },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-100 text-red-600',      step: -1 },
  refunded:         { label: 'Refunded',         color: 'bg-gray-100 text-gray-600',    step: -1 },
}

const STEPS = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered']

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/orders')

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .eq('user_id', user.id) // RLS: only own orders
    .single()

  if (!order) notFound()

  const cfg  = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const addr = order.delivery_address as any

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/orders" className="flex items-center gap-1 text-sm text-green-deep hover:text-green-light mb-6 transition-colors">
        <ChevronLeft size={16} /> Back to orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">{order.order_number}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Placed on {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Timeline */}
      {cfg.step >= 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
          <h2 className="font-display font-bold text-green-deep mb-4">Order Progress</h2>
          <div className="relative">
            <div className="absolute top-3 left-3 right-3 h-0.5 bg-cream-dark" />
            <div
              className="absolute top-3 left-3 h-0.5 bg-green-deep transition-all"
              style={{ width: `${(cfg.step / (STEPS.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {STEPS.map((step, i) => {
                const done   = i <= cfg.step
                const active = i === cfg.step
                return (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div className={`w-6 h-6 rounded-full z-10 flex items-center justify-center text-xs font-bold
                      ${active ? 'bg-saffron text-green-deep' : done ? 'bg-green-deep text-white' : 'bg-cream-dark text-gray-400'}`}>
                      {done && !active ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] font-medium text-center max-w-[56px]
                      ${active ? 'text-saffron' : done ? 'text-green-deep' : 'text-gray-300'}`}>
                      {step}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
        <h2 className="font-display font-bold text-green-deep mb-4">Items</h2>
        <div className="space-y-3">
          {(order as any).items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3">
              <span className="text-xl">{item.product_emoji || '📦'}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-deep">{item.product_name}</p>
                {item.product_weight && <p className="text-xs text-gray-400">{item.product_weight}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">× {item.quantity}</p>
                <p className="text-sm font-bold text-green-deep">₹{item.subtotal}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-cream-dark mt-4 pt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>₹{order.subtotal}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
              <span>−₹{order.discount_amount}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery</span><span>{order.delivery_charge === 0 ? 'Free' : `₹${order.delivery_charge}`}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Taxes</span><span>Included in price</span>
          </div>
          <div className="flex justify-between font-display font-extrabold text-lg text-green-deep border-t border-cream-dark pt-2">
            <span>Total</span><span>₹{order.total_amount}</span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-display font-bold text-green-deep mb-3">Delivery Address</h2>
          <address className="not-italic text-sm text-gray-600 leading-relaxed">
            {addr?.line1}<br />
            {addr?.line2 && <>{addr.line2}<br /></>}
            {addr?.landmark && <>{addr.landmark}<br /></>}
            {addr?.city} — {addr?.pincode}
          </address>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-display font-bold text-green-deep mb-3">Payment</h2>
          <p className="text-sm text-gray-600 capitalize">{order.payment_method?.replace('_', ' ')}</p>
          <p className={`text-sm font-semibold mt-1 capitalize
            ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
            {order.payment_status}
          </p>
          {order.customer_note && (
            <div className="mt-3 pt-3 border-t border-cream-dark">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Your note</p>
              <p className="text-sm text-gray-600">{order.customer_note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
