'use client'
// app/(admin)/admin/coupons/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Coupon } from '@/types'

const EMPTY_FORM = {
  code: '', description: '', discount_type: 'percent' as 'percent' | 'flat',
  discount_value: 10, min_order_value: 0, max_discount: '', usage_limit: '',
  valid_from: new Date().toISOString().split('T')[0], valid_until: '', is_active: true,
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons]     = useState<Coupon[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/coupons?limit=50')
    const json = await res.json()
    setCoupons(json.data?.coupons || [])
    setTotal(json.data?.total || 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      max_discount:  form.max_discount  ? Number(form.max_discount)  : null,
      usage_limit:   form.usage_limit   ? Number(form.usage_limit)   : null,
      valid_until:   form.valid_until   || null,
      description:   form.description   || null,
    }
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success('Coupon created!')
      setShowModal(false)
      setForm(EMPTY_FORM)
      fetchCoupons()
    } else {
      toast.error(json.error || 'Failed to create coupon')
    }
    setSubmitting(false)
  }

  const toggleActive = async (coupon: Coupon) => {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !coupon.is_active }),
    })
    if (res.ok) {
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated')
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
    } else {
      toast.error('Failed to update coupon')
    }
  }

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Coupon deleted')
      setCoupons(prev => prev.filter(c => c.id !== coupon.id))
      setTotal(t => t - 1)
    } else {
      toast.error('Failed to delete coupon')
    }
  }

  const f = (key: keyof typeof form, val: unknown) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} coupons total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-deep text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors"
        >
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Code</th>
                  <th className="px-5 py-3 text-left">Discount</th>
                  <th className="px-5 py-3 text-left">Min Order</th>
                  <th className="px-5 py-3 text-left">Usage</th>
                  <th className="px-5 py-3 text-left">Valid Until</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-green-deep font-mono">{c.code}</p>
                        {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-saffron">
                        {c.discount_type === 'percent'
                          ? `${c.discount_value}%`
                          : `₹${c.discount_value}`}
                      </span>
                      {c.max_discount && (
                        <p className="text-xs text-gray-400">max ₹{c.max_discount}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {c.min_order_value > 0 ? `₹${c.min_order_value}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {c.valid_until
                        ? new Date(c.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'No expiry'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full
                        ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`p-1.5 rounded-lg transition-colors
                            ${c.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {c.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => deleteCoupon(c)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {coupons.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <Tag size={36} className="mx-auto mb-3 opacity-30" />
                <p>No coupons yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-cream-dark">
              <h2 className="font-display font-bold text-xl text-green-deep">New Coupon</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Code *</label>
                  <input
                    required value={form.code}
                    onChange={e => f('code', e.target.value.toUpperCase())}
                    className="input-field mt-1 font-mono uppercase"
                    placeholder="e.g. GOYAL20"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={e => f('discount_type', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Value * {form.discount_type === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    required type="number" step="0.01" min="0.01"
                    value={form.discount_value}
                    onChange={e => f('discount_value', Number(e.target.value))}
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Order (₹)</label>
                  <input
                    type="number" min="0" value={form.min_order_value}
                    onChange={e => f('min_order_value', Number(e.target.value))}
                    className="input-field mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Discount (₹)</label>
                  <input
                    type="number" min="0" value={form.max_discount}
                    onChange={e => f('max_discount', e.target.value)}
                    className="input-field mt-1"
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage Limit</label>
                  <input
                    type="number" min="1" value={form.usage_limit}
                    onChange={e => f('usage_limit', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid From *</label>
                  <input
                    required type="date" value={form.valid_from}
                    onChange={e => f('valid_from', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid Until</label>
                  <input
                    type="date" value={form.valid_until}
                    onChange={e => f('valid_until', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                  <input
                    value={form.description}
                    onChange={e => f('description', e.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g. 10% off on orders above ₹500"
                    maxLength={500}
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox" checked={form.is_active}
                      onChange={e => f('is_active', e.target.checked)}
                      className="w-4 h-4 accent-green-deep"
                    />
                    <span className="text-sm font-medium text-green-deep">Active immediately</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-green-deep text-white rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
