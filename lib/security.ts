// lib/security.ts — Security utilities used across API routes

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'

// ── Rate Limiting (in-memory, swap for Redis in production) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

// Rate limit by IP for public endpoints
export function rateLimitByIP(
  req: NextRequest,
  limit: number = 10,
  windowMs: number = 60_000
) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  const key = `${req.nextUrl.pathname}:${ip}`
  return rateLimit(key, limit, windowMs)
}

// ── Razorpay Signature Verification ─────────────────────────
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set')

  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  const expected = Buffer.from(expectedSignature, 'hex')
  const received = Buffer.from(signature, 'hex')

  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

// ── Input Sanitization ───────────────────────────────────────
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Strip potential HTML injection
    .slice(0, 1000)        // Cap length
}

// ── API Response Helpers ─────────────────────────────────────
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function apiNotFound(resource = 'Resource') {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 })
}

export function apiRateLimited() {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}

// ── Validation Schemas (Zod) ─────────────────────────────────
export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

export const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter a valid 6-digit pincode')

export const orderSchema = z.object({
  full_name:      z.string().min(2).max(100),
  phone:          phoneSchema,
  line1:          z.string().min(5).max(200),
  line2:          z.string().max(200).optional(),
  landmark:       z.string().max(100).optional(),
  city:           z.string().min(2).max(100),
  pincode:        pincodeSchema,
  payment_method: z.enum(['razorpay', 'cod', 'upi', 'card', 'netbanking']),
  coupon_code:    z.string().max(20).optional(),
  customer_note:  z.string().max(500).optional(),
  items:          z.array(z.object({
    product_id: z.string().uuid(),
    quantity:   z.number().int().min(1).max(99),
  })).min(1).max(50),
})

export const productSchema = z.object({
  name:                z.string().min(2).max(200),
  description:         z.string().max(2000).optional(),
  category_id:         z.string().uuid(),
  brand:               z.string().max(100).optional(),
  weight:              z.string().max(50).optional(),
  unit:                z.string().max(20),
  price:               z.number().min(0).max(100000),
  mrp:                 z.number().min(0).max(100000).optional().nullable(),
  cost_price:          z.number().min(0).optional().nullable(),
  tax_rate:            z.number().min(0).max(100),
  hsn_code:            z.string().max(10).optional(),
  stock_qty:           z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  emoji:               z.string().max(10).optional(),
  badge:               z.enum(['sale','new','popular','hot']).nullable().optional(),
  is_active:           z.boolean(),
  is_featured:         z.boolean(),
})

export const couponSchema = z.object({
  code:            z.string().toUpperCase().min(3).max(20),
  discount_type:   z.enum(['percent', 'flat']),
  discount_value:  z.number().min(0).max(100000),
  min_order_value: z.number().min(0),
  max_discount:    z.number().min(0).optional().nullable(),
  usage_limit:     z.number().int().min(0).optional().nullable(),
})

// ── CORS for API routes ───────────────────────────────────────
export function withCors(response: NextResponse): NextResponse {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}
