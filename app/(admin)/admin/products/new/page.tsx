'use client'
// app/(admin)/admin/products/new/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Category, Subcategory } from '@/types'
import ImageUpload from '@/components/admin/ImageUpload'
import BarcodeScanner, { type BarcodeProductData } from '@/components/admin/BarcodeScanner'

const formSchema = z.object({
  name:                z.string().min(2, 'Name must be at least 2 characters').max(200),
  description:         z.string().max(2000).optional(),
  category_id:         z.string().min(1, 'Select a category'),
  subcategory_id:      z.string().optional(),
  brand:               z.string().max(100).optional(),
  weight:              z.string().max(50).optional(),
  unit:                z.string().min(1, 'Unit is required').max(20),
  price:               z.number().min(0.01, 'Price must be > 0').max(100000),
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
  barcode:             z.string().max(20).optional(),
})

type FormData = z.infer<typeof formSchema>

function AutoBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-green-600 text-xs font-semibold">
      <span>✓</span> Auto-filled
    </span>
  )
}

function NewProductInner() {
  const router = useRouter()
  const [categories,    setCategories]    = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [submitting,    setSubmitting]    = useState(false)
  const [imageUrl,      setImageUrl]      = useState<string | null>(null)
  const [showScanner,   setShowScanner]   = useState(false)
  const [autofilled,    setAutofilled]    = useState<Set<string>>(new Set())

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unit: 'pcs', tax_rate: 0, stock_qty: 0, low_stock_threshold: 5,
      is_active: true, is_featured: false,
    },
  })

  // Auto-fill barcode stored by the scanner's "Fill Manually" redirect
  useEffect(() => {
    const bc = sessionStorage.getItem('scan_barcode')
    if (bc) {
      sessionStorage.removeItem('scan_barcode')  // consume so it doesn't re-fill on refresh
      if (/^\d{8,14}$/.test(bc)) {
        setValue('barcode', bc)
        setAutofilled(prev => new Set(prev).add('barcode'))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const watchedCategoryId = watch('category_id')

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(j => setCategories((j.data?.categories || []).filter((c: Category) => c.is_active)))
  }, [])

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!watchedCategoryId) { setSubcategories([]); return }
    const cat = categories.find(c => c.id === watchedCategoryId)
    if (!cat) { setSubcategories([]); return }
    fetch(`/api/admin/subcategories?category=${cat.slug}`)
      .then(r => r.json())
      .then(j => setSubcategories((j.data?.subcategories || []).filter((s: Subcategory) => s.is_active)))
      .catch(() => setSubcategories([]))
    setValue('subcategory_id', '')
  }, [watchedCategoryId, categories, setValue])

  const onBarcodeFound = (data: BarcodeProductData) => {
    const filled = new Set<string>()

    if (data.barcode){ setValue('barcode', data.barcode); filled.add('barcode') }
    if (data.name)   { setValue('name',   data.name);    filled.add('name')    }
    if (data.brand)  { setValue('brand',  data.brand);   filled.add('brand')   }
    if (data.weight) { setValue('weight', data.weight);  filled.add('weight')  }
    if (data.emoji)  { setValue('emoji',  data.emoji);   filled.add('emoji')   }

    // Match category by slug
    const cat = categories.find(c => (c as any).slug === data.category_slug)
    if (cat) { setValue('category_id', cat.id); filled.add('category_id') }

    if (data.image_url) { setImageUrl(data.image_url); filled.add('image_url') }

    setAutofilled(filled)
    setShowScanner(false)

    const count = filled.size
    toast.success(`${count} field${count !== 1 ? 's' : ''} auto-filled from barcode`)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const payload = {
      ...data,
      mrp: (data.mrp == null || !Number.isFinite(data.mrp)) ? null : data.mrp,
      cost_price: (data.cost_price == null || !Number.isFinite(data.cost_price)) ? null : data.cost_price,
      badge: data.badge === '' ? null : data.badge,
      subcategory_id: data.subcategory_id || null,
      barcode:        data.barcode || null,
      image_url: imageUrl,
    }
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success('Product created!')
      router.push('/admin/products')
    } else {
      toast.error(json.error || 'Failed to create product')
      setSubmitting(false)
    }
  }

  const af = (field: string) => autofilled.has(field)

  return (
    <div className="max-w-3xl">
      {showScanner && (
        <BarcodeScanner
          onFound={onBarcodeFound}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-green-deep hover:text-green-light">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-2xl text-green-deep">Add Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in details to add a new product</p>
        </div>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 bg-saffron text-green-deep px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <ScanLine size={16} /> Scan Barcode
        </button>
      </div>

      {autofilled.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
          <span className="text-base">✓</span>
          <span><strong>{autofilled.size} fields</strong> auto-filled from barcode. Review and add price + stock below.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <h2 className="font-display font-bold text-green-deep">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Product Name *{af('name') && <AutoBadge />}
              </label>
              <input
                {...register('name')}
                className={`input-field mt-1 ${af('name') ? 'border-green-400 ring-1 ring-green-300' : ''}`}
                placeholder="e.g. Tata Salt 1kg"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Category *{af('category_id') && <AutoBadge />}
              </label>
              <select
                {...register('category_id')}
                className={`input-field mt-1 ${af('category_id') ? 'border-green-400 ring-1 ring-green-300' : ''}`}
              >
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
            </div>
            {subcategories.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Subcategory</label>
                <select {...register('subcategory_id')} className="input-field mt-1">
                  <option value="">None</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Brand{af('brand') && <AutoBadge />}
              </label>
              <input
                {...register('brand')}
                className={`input-field mt-1 ${af('brand') ? 'border-green-400 ring-1 ring-green-300' : ''}`}
                placeholder="e.g. Tata, Amul"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Emoji{af('emoji') && <AutoBadge />}
              </label>
              <input
                {...register('emoji')}
                className={`input-field mt-1 ${af('emoji') ? 'border-green-400 ring-1 ring-green-300' : ''}`}
                placeholder="🧂" maxLength={10}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Barcode{af('barcode') && <AutoBadge />}
              </label>
              <input
                {...register('barcode')}
                className={`input-field mt-1 font-mono ${af('barcode') ? 'border-green-400 ring-1 ring-green-300' : ''}`}
                placeholder="e.g. 8901058006530"
                maxLength={14}
              />
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
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Product Image{af('image_url') && <AutoBadge />}
            </label>
            <ImageUpload
              currentUrl={imageUrl}
              onUpload={url => { setImageUrl(url); setAutofilled(prev => new Set([...prev, 'image_url'])) }}
              onRemove={() => setImageUrl(null)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</label>
            <textarea {...register('description')} rows={3} className="input-field mt-1 resize-none" placeholder="Optional product description" />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <h2 className="font-display font-bold text-green-deep">Pricing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Price (₹) *</label>
              <input type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="input-field mt-1" placeholder="0.00" />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">MRP (₹)</label>
              <input type="number" step="0.01" {...register('mrp', { setValueAs: v => v === '' ? null : Number(v) })} className="input-field mt-1" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cost (₹)</label>
              <input type="number" step="0.01" {...register('cost_price', { setValueAs: v => v === '' ? null : Number(v) })} className="input-field mt-1" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tax Rate %</label>
              <input type="number" step="0.01" {...register('tax_rate', { valueAsNumber: true })} className="input-field mt-1" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Weight{af('weight') && <AutoBadge />}
              </label>
              <input
                {...register('weight')}
                className={`input-field mt-1 ${af('weight') ? 'border-green-400 ring-1 ring-green-300' : ''}`}
                placeholder="e.g. 1kg, 500ml"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit *</label>
              <input {...register('unit')} className="input-field mt-1" placeholder="pcs, kg, ltr" />
              {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">HSN Code</label>
              <input {...register('hsn_code')} className="input-field mt-1" placeholder="e.g. 2501" />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <h2 className="font-display font-bold text-green-deep">Inventory</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock Qty *</label>
              <input type="number" {...register('stock_qty', { valueAsNumber: true })} className="input-field mt-1" />
              {errors.stock_qty && <p className="text-xs text-red-500 mt-1">{errors.stock_qty.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Low Stock Alert</label>
              <input type="number" {...register('low_stock_threshold', { valueAsNumber: true })} className="input-field mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-green-deep" />
              <span className="text-sm font-medium text-green-deep">Active (visible in store)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_featured')} className="w-4 h-4 accent-saffron" />
              <span className="text-sm font-medium text-green-deep">Featured</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-cream-dark rounded-xl text-sm font-semibold text-green-deep hover:bg-cream transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 bg-green-deep text-white rounded-xl text-sm font-semibold hover:bg-green-mid transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewProductPage() {
  return (
    <Suspense>
      <NewProductInner />
    </Suspense>
  )
}
