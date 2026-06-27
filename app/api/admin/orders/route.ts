// app/api/admin/orders/route.ts
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

const VALID_STATUSES = [
  'pending', 'confirmed', 'preparing',
  'out_for_delivery', 'delivered', 'cancelled', 'refunded',
] as const
type OrderStatus = typeof VALID_STATUSES[number]

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, Number(searchParams.get('page')  || 1))
  const limit  = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))
  const from   = (page - 1) * limit
  const status = searchParams.get('status')  || ''
  const payment= searchParams.get('payment') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo   = searchParams.get('date_to')   || ''

  const adminSupabase = await createAdminClient()
  let query = adminSupabase
    .from('orders')
    .select(
      `*, items:order_items(*), profile:profiles(full_name, phone, email)`,
      { count: 'exact' },
    )
    .order('placed_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status)
  }
  if (payment) query = query.eq('payment_status', payment)
  if (dateFrom) query = query.gte('placed_at', dateFrom)
  if (dateTo)   query = query.lte('placed_at', `${dateTo}T23:59:59`)

  const { data, error, count } = await query
  if (error) return apiError('Failed to fetch orders')
  return apiSuccess({ orders: data, total: count, page, limit })
}
