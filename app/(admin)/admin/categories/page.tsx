'use client'
// app/(admin)/admin/categories/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category } from '@/types'

const EMPTY_FORM = { name: '', slug: '', emoji: '', description: '', display_order: 0, is_active: true }

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Category | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/categories')
    const json = await res.json()
    setCategories(json.data?.categories || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({
      name: cat.name, slug: cat.slug, emoji: cat.emoji || '',
      description: cat.description || '', display_order: cat.display_order,
      is_active: cat.is_active,
    })
    setShowModal(true)
  }

  const f = (key: keyof typeof form, val: unknown) => setForm(prev => ({ ...prev, [key]: val }))

  const handleNameChange = (name: string) => {
    f('name', name)
    if (!editing) f('slug', slugify(name))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      ...form,
      emoji:       form.emoji       || null,
      description: form.description || null,
    }

    const url    = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories'
    const method = editing ? 'PATCH' : 'POST'

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()

    if (res.ok) {
      toast.success(editing ? 'Category updated!' : 'Category created!')
      setShowModal(false)
      fetchCategories()
    } else {
      toast.error(json.error || 'Failed to save category')
    }
    setSubmitting(false)
  }

  const toggleActive = async (cat: Category) => {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cat.is_active }),
    })
    if (res.ok) {
      toast.success(cat.is_active ? 'Category hidden' : 'Category shown')
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
    } else {
      toast.error('Failed to update category')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} categories total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-deep text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-cream text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Slug</th>
                <th className="px-5 py-3 text-left">Order</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.emoji || '📦'}</span>
                      <div>
                        <p className="text-sm font-semibold text-green-deep">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{cat.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <code className="text-xs bg-cream px-2 py-1 rounded-lg text-gray-600">{cat.slug}</code>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{cat.display_order}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full
                      ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cat.is_active ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 text-green-deep hover:bg-cream rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => toggleActive(cat)}
                        className={`p-1.5 rounded-lg transition-colors
                          ${cat.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                        title={cat.is_active ? 'Hide' : 'Show'}
                      >
                        {cat.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && categories.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p>No categories yet</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-cream-dark">
              <h2 className="font-display font-bold text-xl text-green-deep">
                {editing ? `Edit: ${editing.name}` : 'New Category'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emoji</label>
                  <input
                    value={form.emoji}
                    onChange={e => f('emoji', e.target.value)}
                    className="input-field mt-1 text-center text-xl"
                    placeholder="🛒"
                    maxLength={10}
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</label>
                  <input
                    required value={form.name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g. Dairy Products"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug *</label>
                <input
                  required value={form.slug}
                  onChange={e => f('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="input-field mt-1 font-mono text-sm"
                  placeholder="dairy-products"
                />
                <p className="text-xs text-gray-400 mt-1">Used in URLs — lowercase, hyphens only</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                <input
                  value={form.description}
                  onChange={e => f('description', e.target.value)}
                  className="input-field mt-1"
                  placeholder="Optional short description"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Display Order</label>
                <input
                  type="number" min="0" value={form.display_order}
                  onChange={e => f('display_order', Number(e.target.value))}
                  className="input-field mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">Lower number = shown first in store</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.is_active}
                  onChange={e => f('is_active', e.target.checked)}
                  className="w-4 h-4 accent-green-deep"
                />
                <span className="text-sm font-medium text-green-deep">Visible in store</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-green-deep text-white rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Saving…' : <><Check size={15} /> {editing ? 'Save Changes' : 'Create'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
