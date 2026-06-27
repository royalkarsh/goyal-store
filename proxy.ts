// proxy.ts — Runs on every request before rendering (Next.js 16 replacement for middleware.ts)
// Handles: auth session refresh, route protection, security headers

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_CUSTOMER_ROUTES = ['/orders', '/profile', '/checkout', '/addresses']
const PROTECTED_ADMIN_ROUTES    = ['/admin']
const AUTH_ROUTES               = ['/login', '/verify']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ── 1. SECURITY HEADERS ──────────────────────────────────────
  const h = supabaseResponse.headers
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'DENY')
  h.set('X-XSS-Protection', '1; mode=block')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  h.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com",
      "frame-src https://api.razorpay.com",
    ].join('; ')
  )
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // ── 2. SUPABASE SESSION REFRESH ───────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not write any logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── 3. ROUTE PROTECTION ───────────────────────────────────────

  // Unauthenticated → redirect to login
  if (
    !user &&
    (PROTECTED_CUSTOMER_ROUTES.some(r => pathname.startsWith(r)) ||
     PROTECTED_ADMIN_ROUTES.some(r => pathname.startsWith(r)))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Logged-in → redirect away from auth pages
  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Admin routes — verify role in DB
  if (user && PROTECTED_ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/not-admin'
      return NextResponse.redirect(url)
    }
  }

  // ── 4. API ADMIN PROTECTION ───────────────────────────────────
  if (pathname.startsWith('/api/admin') && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
