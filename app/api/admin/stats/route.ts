// app/api/admin/stats/route.ts — Dashboard analytics
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return apiUnauthorized()

  const adminSupabase = await createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: todayOrders },
    { data: monthOrders },
    { data: pendingOrders },
    { count: totalProducts },
    { count: totalCustomers },
    { data: lowStock },
  ] = await Promise.all([
    adminSupabase.from('orders').select('total_amount').gte('placed_at', today),
    adminSupabase.from('orders').select('total_amount').gte('placed_at', monthStart),
    adminSupabase.from('orders').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed', 'preparing']),
    adminSupabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    adminSupabase.from('low_stock_products').select('*'),
  ])

  const stats = {
    todayRevenue:   todayOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0,
    todayOrders:    todayOrders?.length ?? 0,
    monthRevenue:   monthOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0,
    monthOrders:    monthOrders?.length ?? 0,
    pendingOrders:  pendingOrders ?? 0,
    totalProducts:  totalProducts ?? 0,
    totalCustomers: totalCustomers ?? 0,
    lowStockCount:  lowStock?.length ?? 0,
    lowStockItems:  lowStock?.slice(0, 5) ?? [],
  }

  return apiSuccess(stats)
}
