'use client'
// app/(admin)/admin/subcategories/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category, Subcategory } from '@/types'

// auto-generate slug from name
function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminSubcategoriesPage() {
  const [categories,    setCategories]    = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)

  // New subcategory form state
  const [name,       setName]       = useState('')
  const [emoji,      setEmoji]      = useState('')
  const [catId,      setCatId]      = useState('')
  const [saving,     setSaving]     = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [subRes, catRes] = await Promise.all([
      fetch('/api/admin/subcategories').then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
    ])
    setSubcategories(subRes.data?.subcategories || [])
    setCategories((catRes.data?.categories || []).filter((c: Category) => c.is_active))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCreate = async () => {
    if (!name.trim() || !catId) { toast.error('Name and category are required'); return }
    setSaving(true)
    const res = await fetch('/api/admin/subcategories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        name.trim(),
        slug:        toSlug(name.trim()),
        emoji:       emoji.trim() || undefined,
        category_id: catId,
        display_order: subcategories.filter(s => s.category_id === catId).length + 1,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success('Subcategory added!')
      setName(''); setEmoji(''); setCatId('')
      setShowForm(false)
      fetchAll()
    } else {
      toast.error(json.error || 'Failed to create')
    }
    setSaving(false)
  }

  const toggleActive = async (sub: Subcategory) => {
    const res = await fetch(`/api/admin/subcategories/${sub.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !sub.is_active }),
    })
    if (res.ok) {
      toast.success(sub.is_active ? 'Hidden' : 'Visible')
      setSubcategories(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: !s.is_active } : s))
    } else {
      toast.error('Failed to update')
    }
  }

  // Group subcategories by category
  const grouped = categories.map(cat => ({
    cat,
    subs: subcategories.filter(s => s.category_id === cat.id),
  })).filter(g => g.subs.length > 0 || true)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Subcategories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subcategories.length} subcategories across {categories.length} categories</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 bg-green-deep text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors"
        >
          <Plus size={16} /> Add Subcategory
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-5 mb-6 animate-fade-in">
          <h2 className="font-display font-bold text-green-deep mb-4">New Subcategory</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field mt-1"
                placeholder="e.g. Atta & Flour"
              />
              {name && (
                <p className="text-xs text-gray-400 mt-1">Slug: <code>{toSlug(name)}</code></p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Emoji</label>
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className="input-field mt-1"
                placeholder="🌾"
                maxLength={10}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category *</label>
              <select value={catId} onChange={e => setCatId(e.target.value)} className="input-field mt-1">
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setName(''); setEmoji(''); setCatId('') }}
              className="px-4 py-2 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-6 py-2 bg-green-deep text-white rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add Subcategory'}
            </button>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cat, subs }) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
              {/* Category header */}
              <div className="px-5 py-3 bg-cream border-b border-cream-dark flex items-center gap-2">
                <span className="text-xl">{cat.emoji}</span>
                <span className="font-display font-bold text-green-deep">{cat.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{subs.length} subcategories</span>
              </div>

              {subs.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 italic">No subcategories yet</p>
              ) : (
                <div className="divide-y divide-cream-dark">
                  {subs
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xl w-8 text-center shrink-0">{sub.emoji || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${sub.is_active ? 'text-green-deep' : 'text-gray-400'}`}>
                            {sub.name}
                          </p>
                          <p className="text-xs text-gray-400">{sub.slug}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full
                          ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {sub.is_active ? 'Visible' : 'Hidden'}
                        </span>
                        <button
                          onClick={() => toggleActive(sub)}
                          className={`p-1.5 rounded-lg transition-colors
                            ${sub.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                          title={sub.is_active ? 'Hide' : 'Show'}
                        >
                          {sub.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
