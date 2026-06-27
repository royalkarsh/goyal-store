'use client'
// app/(store)/orders/page.tsx — Customer order history
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronRight, Package, ChevronDown, ChevronUp } from 'lucide-react'
import type { Order } from '@/types'

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

export default function OrdersPage() {
  const router               = useRouter()
  const [orders, setOrders]  = useState<Order[]>([])
  const [loading, setLoading]= useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/orders'); return }

      const res  = await fetch('/api/orders?limit=50')
      const json = await res.json()
      setOrders(json.data?.orders || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-card" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display font-extrabold text-3xl text-green-deep mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="font-display font-bold text-xl text-green-deep mb-2">No orders yet</p>
          <p className="text-gray-400 text-sm mb-6">Your order history will appear here</p>
          <Link href="/shop" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg      = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const expanded = expandedId === order.id
            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-cream/40 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-display font-bold text-green-deep">{order.order_number}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' • '}
                      {(order as any).items?.length || 0} items
                      {' • '}
                      <span className="font-semibold text-green-deep">₹{order.total_amount}</span>
                    </p>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-cream-dark px-5 pb-5 pt-4">
                    {/* Status timeline */}
                    {cfg.step >= 0 && (
                      <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-hide pb-1">
                        {STEPS.map((step, i) => {
                          const done   = i <= cfg.step
                          const active = i === cfg.step
                          return (
                            <div key={step} className="flex items-center shrink-0">
                              <div className={`flex flex-col items-center gap-1`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                  ${active ? 'bg-saffron text-green-deep ring-2 ring-saffron/30 ring-offset-2' :
                                    done ? 'bg-green-deep text-white' : 'bg-cream-dark text-gray-400'}`}>
                                  {done && !active ? '✓' : i + 1}
                                </div>
                                <p className={`text-[10px] font-medium whitespace-nowrap
                                  ${active ? 'text-saffron' : done ? 'text-green-deep' : 'text-gray-300'}`}>
                                  {step}
                                </p>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className={`w-8 h-0.5 mt-[-12px] mx-1 rounded ${i < cfg.step ? 'bg-green-deep' : 'bg-cream-dark'}`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2 mb-4">
                      {(order as any).items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-green-deep">{item.product_emoji} {item.product_name} × {item.quantity}</span>
                          <span className="font-semibold text-green-deep">₹{item.subtotal}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-green-light hover:text-green-deep transition-colors"
                    >
                      View full details <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
