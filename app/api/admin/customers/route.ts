// app/api/admin/customers/route.ts
import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/security'

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
  const search = searchParams.get('search') || ''

  const adminSupabase = await createAdminClient()
  let query = adminSupabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('Customers fetch error:', error)
    return apiError('Failed to fetch customers')
  }

  return apiSuccess({ customers: data, total: count, page, limit,
    pages: Math.ceil((count || 0) / limit) })
}
