'use client'
import React from 'react'
// components/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import {
  ShoppingBag, TrendingUp, Clock, AlertTriangle,
  Package, Users, IndianRupee, BarChart3,
  CheckCircle, XCircle, Truck, Eye
} from 'lucide-react'
import type { DashboardStats, Order } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={12} /> },
  confirmed:        { label: 'Confirmed',         color: 'bg-blue-100 text-blue-800',   icon: <CheckCircle size={12} /> },
  preparing:        { label: 'Preparing',         color: 'bg-purple-100 text-purple-800', icon: <Package size={12} /> },
  out_for_delivery: { label: 'Out for Delivery',  color: 'bg-orange-100 text-orange-800', icon: <Truck size={12} /> },
  delivered:        { label: 'Delivered',         color: 'bg-green-100 text-green-800', icon: <CheckCircle size={12} /> },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-100 text-red-800',     icon: <XCircle size={12} /> },
}

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/orders?limit=10').then(r => r.json()),
    ]).then(([statsRes, ordersRes]) => {
      setStats(statsRes.data)
      setOrders(ordersRes.data?.orders || [])
      setLoading(false)
    })
  }, [])

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId)
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o))
    setUpdatingOrder(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-green-deep font-display font-bold text-xl animate-pulse">
          Loading dashboard…
        </div>
      </div>
    )
  }

  const statCards = [
    { label: "Today's Revenue", value: `₹${stats?.todayRevenue?.toLocaleString('en-IN') || 0}`, icon: <IndianRupee size={20} />, color: 'bg-green-deep text-white' },
    { label: "Today's Orders",   value: stats?.todayOrders || 0,   icon: <ShoppingBag size={20} />, color: 'bg-saffron text-green-deep' },
    { label: 'Pending Orders',   value: stats?.pendingOrders || 0, icon: <Clock size={20} />,       color: 'bg-orange-50 text-orange-700' },
    { label: 'Low Stock Items',  value: stats?.lowStockCount || 0, icon: <AlertTriangle size={20} />, color: stats?.lowStockCount ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700' },
    { label: 'Month Revenue',    value: `₹${stats?.monthRevenue?.toLocaleString('en-IN') || 0}`, icon: <TrendingUp size={20} />, color: 'bg-blue-50 text-blue-700' },
    { label: 'Month Orders',     value: stats?.monthOrders || 0,  icon: <BarChart3 size={20} />,    color: 'bg-purple-50 text-purple-700' },
    { label: 'Total Products',   value: stats?.totalProducts || 0, icon: <Package size={20} />,     color: 'bg-cream text-green-deep border border-cream-dark' },
    { label: 'Customers',        value: stats?.totalCustomers || 0, icon: <Users size={20} />,      color: 'bg-cream text-green-deep border border-cream-dark' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Dashboard</h1>
          <p className="text-sm text-gray-400">Welcome back, {adminName} 👋</p>
        </div>
        <a href="/" target="_blank" className="flex items-center gap-1.5 text-sm text-green-light hover:text-green-deep transition-colors font-medium">
          <Eye size={14} /> View Store
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className={`rounded-2xl p-4 ${card.color}`}>
              <div className="flex items-center justify-between mb-2">
                {card.icon}
              </div>
              <p className="font-display font-extrabold text-2xl">{card.value}</p>
              <p className="text-xs opacity-70 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-cream-dark">
            <h2 className="font-display font-bold text-lg text-green-deep">Recent Orders</h2>
            <a href="/admin/orders" className="text-sm text-green-light font-medium hover:underline">View all →</a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Order</th>
                  <th className="px-6 py-3 text-left">Customer</th>
                  <th className="px-6 py-3 text-left">Items</th>
                  <th className="px-6 py-3 text-left">Total</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Time</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {orders.map(order => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                  return (
                    <tr key={order.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-green-deep">{order.order_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{order.payment_method}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-green-deep">{(order.delivery_address as any)?.line1?.slice(0, 20)}…</p>
                        <p className="text-xs text-gray-400">{(order.delivery_address as any)?.pincode}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.items?.length || '—'} items
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-green-deep">₹{order.total_amount}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(order.placed_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          onChange={e => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingOrder === order.id}
                          className="text-xs border border-cream-dark rounded-lg px-2 py-1.5 bg-white text-green-deep focus:outline-none focus:ring-1 focus:ring-green-muted disabled:opacity-50"
                        >
                          {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Low stock alert */}
        {stats?.lowStockCount ? (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-semibold text-red-800">{stats.lowStockCount} product(s) running low on stock</h3>
            </div>
            {stats.lowStockItems?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-t border-red-100">
                <span className="text-sm text-red-700">{item.emoji} {item.name}</span>
                <span className="text-sm font-bold text-red-800">{item.stock_qty} left</span>
              </div>
            ))}
            <a href="/admin/inventory" className="mt-3 block text-sm font-medium text-red-700 hover:text-red-900 underline">
              Manage inventory →
            </a>
          </div>
        ) : null}
    </div>
  )
}
