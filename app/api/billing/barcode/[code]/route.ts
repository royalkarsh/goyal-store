// app/api/billing/barcode/[code]/route.ts
// Fetch a product from the DB by barcode — for the billing/POS system.
// Returns name, price, unit, stock so the billing UI can add it to the bill instantly.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, rateLimitByIP } from '@/lib/security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  // Rate-limit: 60 scans/min per IP (generous for a POS terminal)
  const { allowed } = rateLimitByIP(request, 60, 60_000)
  if (!allowed) return apiError('Too many requests', 429)

  // Must be logged in (admin or staff at the billing counter)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { code } = await params
  if (!/^\d{8,14}$/.test(code)) return apiError('Invalid barcode', 400)

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, name, brand, weight, unit, price, mrp,
      emoji, image_url, stock_qty, barcode,
      category:categories(name)
    `)
    .eq('barcode', code)
    .eq('is_active', true)
    .single()

  if (error || !product) return apiError('Product not found', 404)

  if (product.stock_qty <= 0) {
    return apiError(`${product.name} is out of stock`, 422)
  }

  return apiSuccess({
    id:         product.id,
    name:       product.name,
    brand:      product.brand,
    weight:     product.weight,
    unit:       product.unit,
    price:      product.price,
    mrp:        product.mrp,
    emoji:      product.emoji,
    image_url:  product.image_url,
    stock_qty:  product.stock_qty,
    barcode:    product.barcode,
    category:   (product.category as any)?.name,
  })
}
