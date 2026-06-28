// app/api/admin/barcode/[code]/route.ts — Look up product info by barcode via Open Food Facts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, rateLimitByIP } from '@/lib/security'

const CATEGORY_MAP: { pattern: RegExp; slug: string }[] = [
  { pattern: /cereal|grain|flour|rice|lentil|pulse|atta|dal|wheat|maize|corn|oat/i,        slug: 'staples' },
  { pattern: /dairy|milk|cheese|butter|egg|curd|paneer|ghee|cream|yogurt|lassi/i,          slug: 'dairy' },
  { pattern: /snack|biscuit|chip|chocolate|candy|cookie|namkeen|wafer|cracker|popcorn/i,   slug: 'snacks' },
  { pattern: /beverage|drink|tea|coffee|juice|water|soda|cola|syrup|energy-drink/i,        slug: 'beverages' },
  { pattern: /spice|condiment|seasoning|masala|sauce|pickle|chutney|vinegar|ketchup/i,     slug: 'spices' },
  { pattern: /personal|beauty|hygiene|soap|shampoo|toothpaste|hair|skin|lotion|deo/i,      slug: 'personal' },
  { pattern: /cleaning|household|detergent|dish|floor|toilet|bleach|fabric|laundry/i,      slug: 'household' },
]

const EMOJI_MAP: Record<string, string> = {
  staples: '🌾', dairy: '🥛', snacks: '🍿',
  beverages: '☕', spices: '🌶️', personal: '🧴', household: '🧹',
}

function guessCategory(tags: string[]): string {
  const combined = tags.join(' ')
  for (const { pattern, slug } of CATEGORY_MAP) {
    if (pattern.test(combined)) return slug
  }
  return 'staples'
}

// Try multiple open product databases in order — all share the same API structure
const DATABASES = [
  'world.openfoodfacts.org',    // food, beverages, staples
  'world.openbeautyfacts.org',  // personal care, cosmetics, soap, shampoo
  'world.openproductsfacts.org',// general household products
]

async function fetchFromDatabases(code: string): Promise<any | null> {
  for (const host of DATABASES) {
    try {
      const res = await fetch(`https://${host}/api/v0/product/${code}.json`, {
        headers: { 'User-Agent': 'GoyalGeneralStore/1.0 (mohangoel.anpara@gmail.com)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) continue
      const body = await res.json()
      if (body.status === 1 && body.product) return body.product
    } catch {
      // timeout or network error — try next database
    }
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { allowed } = rateLimitByIP(request, 20, 60_000)
  if (!allowed) return apiError('Too many requests', 429)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return apiUnauthorized()

  const { code } = await params
  // Sanitize: digits only, 8–14 chars (EAN-8, EAN-13, UPC-A, etc.)
  if (!/^\d{8,14}$/.test(code)) return apiError('Invalid barcode format', 400)

  const p = await fetchFromDatabases(code)
  if (!p) return apiError('Product not found in any database', 404)

  const categoriesTags: string[] = p.categories_tags || []
  const categorySlug = guessCategory(categoriesTags)

  return apiSuccess({
    name:          p.product_name || p.product_name_en || null,
    brand:         p.brands       || null,
    weight:        p.quantity     || null,
    image_url:     p.image_front_url || p.image_url || null,
    emoji:         EMOJI_MAP[categorySlug] ?? '📦',
    category_slug: categorySlug,
    barcode:       code,
  })
}
