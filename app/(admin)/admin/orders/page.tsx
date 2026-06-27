'use client'
// app/(admin)/admin/orders/page.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Order } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-800' },
  confirmed:        { label: 'Confirmed',         color: 'bg-blue-100 text-blue-800'   },
  preparing:        { label: 'Preparing',         color: 'bg-purple-100 text-purple-800'},
  out_for_delivery: { label: 'Out for Delivery',  color: 'bg-orange-100 text-orange-800'},
  delivered:        { label: 'Delivered',         color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-100 text-red-700'     },
  refunded:         { label: 'Refunded',          color: 'bg-gray-100 text-gray-600'   },
}

const STATUSES = Object.keys(STATUS_CONFIG)

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    const res  = await fetch(`/api/admin/orders?${params}`)
    const json = await res.json()
    setOrders(json.data?.orders || [])
    setTotal(json.data?.total || 0)
    setLoading(false)
  }, [page, status])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success(`Order updated to ${STATUS_CONFIG[newStatus]?.label}`)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
    } else {
      toast.error(json.error || 'Failed to update order')
    }
    setUpdating(null)
  }

  const pages = Math.ceil(total / 20)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} orders total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => { setStatus(''); setPage(1) }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!status ? 'bg-green-deep text-white' : 'border border-cream-dark text-green-deep hover:bg-cream'}`}
        >
          All
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${status === s ? 'bg-green-deep text-white' : 'border border-cream-dark text-green-deep hover:bg-cream'}`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Order</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Items</th>
                  <th className="px-5 py-3 text-left">Total</th>
                  <th className="px-5 py-3 text-left">Payment</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Time</th>
                  <th className="px-5 py-3 text-left">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                  const expanded = expandedId === order.id
                  const profile = (order as any).profile
                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className="hover:bg-cream/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : order.id)}
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-bold text-green-deep">{order.order_number}</p>
                          <p className="text-xs text-gray-400 capitalize">{order.payment_method}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-green-deep">{profile?.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{profile?.phone || ''}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          {(order as any).items?.length || 0}
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-green-deep">
                          ₹{order.total_amount}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full
                            ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">
                          {new Date(order.placed_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <select
                              value={order.status}
                              onChange={e => updateStatus(order.id, e.target.value)}
                              disabled={updating === order.id}
                              className="text-xs border border-cream-dark rounded-lg px-2 py-1.5 bg-white text-green-deep focus:outline-none disabled:opacity-50"
                            >
                              {STATUSES.map(s => (
                                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                              ))}
                            </select>
                            {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={8} className="bg-cream/60 px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                                {(order as any).items?.map((item: any) => (
                                  <div key={item.id} className="flex justify-between text-sm py-1 border-b border-cream-dark last:border-0">
                                    <span className="text-green-deep">{item.product_emoji} {item.product_name} × {item.quantity}</span>
                                    <span className="font-semibold text-green-deep">₹{item.subtotal}</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Delivery Address</p>
                                <p className="text-sm text-green-deep">
                                  {(order.delivery_address as any)?.line1}<br />
                                  {(order.delivery_address as any)?.line2}<br />
                                  {(order.delivery_address as any)?.city} — {(order.delivery_address as any)?.pincode}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
                <p>No orders found</p>
              </div>
            )}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-cream-dark">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-cream-dark rounded-lg disabled:opacity-40 hover:bg-cream">Previous</button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-sm border border-cream-dark rounded-lg disabled:opacity-40 hover:bg-cream">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
