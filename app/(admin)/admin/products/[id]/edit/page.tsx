'use client'
// app/(admin)/admin/products/[id]/edit/page.tsx
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category, Product } from '@/types'
import ImageUpload from '@/components/admin/ImageUpload'

const formSchema = z.object({
  name:                z.string().min(2).max(200),
  description:         z.string().max(2000).optional(),
  category_id:         z.string().min(1, 'Select a category'),
  brand:               z.string().max(100).optional(),
  weight:              z.string().max(50).optional(),
  unit:                z.string().min(1).max(20),
  price:               z.number().min(0.01).max(100000),
  mrp:                 z.number().min(0).max(100000).nullable().optional(),
  cost_price:          z.number().min(0).nullable().optional(),
  tax_rate:            z.number().min(0).max(100),
  hsn_code:            z.string().max(10).optional(),
  stock_qty:           z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  emoji:               z.string().max(10).optional(),
  badge:               z.enum(['sale', 'new', 'popular', 'hot', '']).optional(),
  is_active:           z.boolean(),
  is_featured:         z.boolean(),
})

type FormData = z.infer<typeof formSchema>

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct]       = useState<Product | null>(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imageUrl, setImageUrl]     = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${id}`).then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
    ]).then(([prodRes, catRes]) => {
      const p = prodRes.data
      setProduct(p)
      setImageUrl(p.image_url || null)
      reset({
        name: p.name, description: p.description || '',
        category_id: p.category_id, brand: p.brand || '',
        weight: p.weight || '', unit: p.unit,
        price: p.price, mrp: p.mrp ?? undefined, cost_price: p.cost_price ?? undefined,
        tax_rate: p.tax_rate, hsn_code: p.hsn_code || '',
        stock_qty: p.stock_qty, low_stock_threshold: p.low_stock_threshold,
        emoji: p.emoji || '', badge: p.badge || '',
        is_active: p.is_active, is_featured: p.is_featured,
      })
      setCategories((catRes.data?.categories || []).filter((c: Category) => c.is_active))
      setLoading(false)
    })
  }, [id, reset])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const payload = {
      ...data,
      mrp: (data.mrp == null || !Number.isFinite(data.mrp)) ? null : data.mrp,
      cost_price: (data.cost_price == null || !Number.isFinite(data.cost_price)) ? null : data.cost_price,
      badge: data.badge === '' ? null : data.badge,
      image_url: imageUrl,
    }
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success('Product updated!')
      router.push('/admin/products')
    } else {
      toast.error(json.error || 'Failed to update')
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Product deactivated')
      router.push('/admin/products')
    } else {
      toast.error('Failed to deactivate')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return (
    <div className="max-w-3xl space-y-5">
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-green-deep hover:text-green-light">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-green-deep">
              Edit: {product?.emoji} {product?.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Update product details</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
            ${confirmDelete
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-red-200 text-red-600 hover:bg-red-50'}`}
        >
          <Trash2 size={15} />
          {deleting ? 'Deactivating…' : confirmDelete ? 'Confirm Deactivate' : 'Deactivate'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <h2 className="font-display font-bold text-green-deep">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Product Name *</label>
              <input {...register('name')} className="input-field mt-1" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category *</label>
              <select {...register('category_id')} className="input-field mt-1">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Brand</label>
              <input {...register('brand')} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Emoji</label>
              <input {...register('emoji')} className="input-field mt-1" maxLength={10} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Badge</label>
              <select {...register('badge')} className="input-field mt-1">
                <option value="">None</option>
                <option value="new">New</option>
                <option value="popular">Popular</option>
                <option value="hot">Hot</option>
                <option value="sale">Sale</option>
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <ImageUpload
              currentUrl={imageUrl}
              onUpload={url => setImageUrl(url)}
              onRemove={() => setImageUrl(null)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</label>
            <textarea {...register('description')} rows={3} className="input-field mt-1 resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <h2 className="font-display font-bold text-green-deep">Pricing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Price (₹) *</label>
              <input type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="input-field mt-1" />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">MRP (₹)</label>
              <input type="number" step="0.01" {...register('mrp', { setValueAs: v => v === '' ? null : Number(v) })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cost (₹)</label>
              <input type="number" step="0.01" {...register('cost_price', { setValueAs: v => v === '' ? null : Number(v) })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tax %</label>
              <input type="number" step="0.01" {...register('tax_rate', { valueAsNumber: true })} className="input-field mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Weight</label>
              <input {...register('weight')} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit *</label>
              <input {...register('unit')} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">HSN Code</label>
              <input {...register('hsn_code')} className="input-field mt-1" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <h2 className="font-display font-bold text-green-deep">Inventory & Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock Qty</label>
              <input type="number" {...register('stock_qty', { valueAsNumber: true })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Low Stock Alert</label>
              <input type="number" {...register('low_stock_threshold', { valueAsNumber: true })} className="input-field mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-green-deep" />
              <span className="text-sm font-medium text-green-deep">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_featured')} className="w-4 h-4 accent-saffron" />
              <span className="text-sm font-medium text-green-deep">Featured</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 py-3 bg-green-deep text-white rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
