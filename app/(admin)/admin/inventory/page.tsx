'use client'
// app/(admin)/admin/inventory/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { Warehouse, AlertTriangle, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface StockItem {
  id: string
  name: string
  emoji: string | null
  stock_qty: number
  low_stock_threshold: number
  is_active: boolean
  category: { name: string } | null
}

const REASONS = [
  { value: 'restock',    label: 'Restock'    },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return',     label: 'Return'     },
  { value: 'damage',     label: 'Damage'     },
] as const

export default function AdminInventoryPage() {
  const [items, setItems]       = useState<StockItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'low'>('all')
  const [editing, setEditing]   = useState<string | null>(null)
  const [newQty, setNewQty]     = useState<number>(0)
  const [reason, setReason]     = useState<'restock' | 'adjustment' | 'return' | 'damage'>('restock')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter === 'low') params.set('low_stock', 'true')
    const res  = await fetch(`/api/admin/inventory?${params}`)
    const json = await res.json()
    setItems(json.data?.products || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const startEdit = (item: StockItem) => {
    setEditing(item.id)
    setNewQty(item.stock_qty)
    setReason('restock')
    setNote('')
  }

  const cancelEdit = () => { setEditing(null) }

  const saveStock = async (item: StockItem) => {
    setSaving(true)
    const res = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: item.id, new_qty: newQty, reason, note }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success(`Stock updated: ${item.name} → ${newQty}`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock_qty: newQty } : i))
      setEditing(null)
    } else {
      toast.error(json.error || 'Failed to update stock')
    }
    setSaving(false)
  }

  const lowStockCount = items.filter(i => i.stock_qty <= i.low_stock_threshold).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} products</p>
        </div>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold">
            <AlertTriangle size={15} />
            {lowStockCount} low stock
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${filter === f ? 'bg-green-deep text-white' : 'border border-cream-dark text-green-deep hover:bg-cream'}`}
          >
            {f === 'all' ? 'All Products' : '⚠ Low Stock Only'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-cream rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Current Stock</th>
                  <th className="px-5 py-3 text-left">Alert At</th>
                  <th className="px-5 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {items.map(item => {
                  const low = item.stock_qty <= item.low_stock_threshold
                  const isEditing = editing === item.id
                  return (
                    <tr key={item.id} className={`transition-colors ${low ? 'bg-red-50/40' : 'hover:bg-cream/30'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.emoji || '📦'}</span>
                          <p className="text-sm font-semibold text-green-deep">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {item.category?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={newQty}
                            onChange={e => setNewQty(Number(e.target.value))}
                            className="input-field py-1.5 w-24 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className={`text-sm font-bold flex items-center gap-1 ${low ? 'text-red-600' : 'text-green-deep'}`}>
                            {low && <AlertTriangle size={12} />}
                            {item.stock_qty}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {item.low_stock_threshold}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={reason}
                                onChange={e => setReason(e.target.value as any)}
                                className="text-xs border border-cream-dark rounded-lg px-2 py-1.5 bg-white text-green-deep focus:outline-none"
                              >
                                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                              <button
                                onClick={() => saveStock(item)}
                                disabled={saving}
                                className="p-1.5 bg-green-deep text-white rounded-lg hover:bg-green-mid disabled:opacity-50"
                              >
                                <Check size={14} />
                              </button>
                              <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                <X size={14} />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              className="text-xs border border-cream-dark rounded-lg px-2 py-1.5 w-48 bg-white focus:outline-none focus:ring-1 focus:ring-green-muted"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="px-3 py-1.5 text-xs font-semibold border border-green-deep text-green-deep rounded-lg hover:bg-green-deep hover:text-white transition-colors"
                          >
                            Update Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <Warehouse size={36} className="mx-auto mb-3 opacity-30" />
                <p>No products found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
