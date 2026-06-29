// app/api/orders/route.ts — POST /api/orders (create order)
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  apiSuccess, apiError, apiUnauthorized,
  rateLimitByIP, orderSchema
} from '@/lib/security'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const FREE_DELIVERY_ABOVE = 1000
const DELIVERY_CHARGE     = 30
const MIN_ORDER_AMOUNT    = 200

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = 10
  const from = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('orders')
    .select(`*, items:order_items(*)`, { count: 'exact' })
    .eq('user_id', user.id)
    .order('placed_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return apiError('Failed to fetch orders')

  return apiSuccess({ orders: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  // Strict rate limit on order creation
  const { allowed } = rateLimitByIP(request, 5, 60_000)
  if (!allowed) return apiError('Too many requests. Please wait before placing another order.', 429)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid request body')
  }

  // Validate input with Zod
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || 'Invalid order data')
  }
  const data = parsed.data

  // Use admin client for server-side operations
  const adminSupabase = await createAdminClient()

  // ── Fetch and validate all products ─────────────────────
  const productIds = data.items.map(i => i.product_id)
  const { data: products, error: prodError } = await adminSupabase
    .from('products')
    .select('id, name, price, emoji, weight, tax_rate, hsn_code, stock_qty, is_active')
    .in('id', productIds)
    .eq('is_active', true)

  if (prodError || !products) return apiError('Failed to fetch products')

  // Verify all products exist and have sufficient stock
  for (const item of data.items) {
    const product = products.find(p => p.id === item.product_id)
    if (!product) return apiError(`Product not found: ${item.product_id}`)
    if (product.stock_qty < item.quantity) {
      return apiError(`Insufficient stock for: ${product.name}`)
    }
  }

  // ── Calculate pricing (server-side, never trust client) ──
  const orderItems = data.items.map(item => {
    const product = products.find(p => p.id === item.product_id)!
    return {
      product_id:     item.product_id,
      product_name:   product.name,
      product_emoji:  product.emoji,
      product_weight: product.weight,
      unit_price:     product.price,
      quantity:       item.quantity,
      subtotal:       +(product.price * item.quantity).toFixed(2),
      tax_rate:       product.tax_rate,
      hsn_code:       product.hsn_code,
    }
  })

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0)
  const taxAmount = 0 // prices are tax-inclusive

  // Minimum order check
  if (subtotal < MIN_ORDER_AMOUNT) {
    return apiError(`Minimum order amount is ₹${MIN_ORDER_AMOUNT}. Add ₹${(MIN_ORDER_AMOUNT - subtotal).toFixed(0)} more.`)
  }

  // ── Validate coupon ──────────────────────────────────────
  let discountAmount = 0
  if (data.coupon_code) {
    const { data: coupon } = await adminSupabase
      .from('coupons')
      .select('*')
      .eq('code', data.coupon_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (coupon && subtotal >= coupon.min_order_value) {
      const now = new Date()
      const validFrom = new Date(coupon.valid_from)
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null

      if (now >= validFrom && (!validUntil || now <= validUntil)) {
        if (!coupon.usage_limit || coupon.used_count < coupon.usage_limit) {
          if (coupon.discount_type === 'percent') {
            discountAmount = (subtotal * coupon.discount_value) / 100
            if (coupon.max_discount) discountAmount = Math.min(discountAmount, coupon.max_discount)
          } else {
            discountAmount = coupon.discount_value
          }
          discountAmount = +discountAmount.toFixed(2)

          // Increment usage count
          await adminSupabase
            .from('coupons')
            .update({ used_count: coupon.used_count + 1 })
            .eq('id', coupon.id)
        }
      }
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const deliveryCharge = afterDiscount >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE
  const total = +(afterDiscount + deliveryCharge + taxAmount).toFixed(2)

  const deliveryAddress = {
    line1: data.line1,
    line2: data.line2 || '',
    landmark: data.landmark || '',
    city: data.city,
    pincode: data.pincode,
  }

  // ── Create order in DB ───────────────────────────────────
  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .insert({
      user_id:          user.id,
      status:           'pending',
      payment_status:   'pending',
      payment_method:   data.payment_method,
      delivery_address: deliveryAddress,
      delivery_slot:    data.delivery_slot,
      subtotal:         +subtotal.toFixed(2),
      discount_amount:  discountAmount,
      delivery_charge:  deliveryCharge,
      tax_amount:       taxAmount,
      total_amount:     total,
      coupon_code:      data.coupon_code || null,
      customer_note:    data.customer_note || null,
    })
    .select()
    .single()

  if (orderError || !order) return apiError('Failed to create order')

  // ── Insert order items ───────────────────────────────────
  const { error: itemsError } = await adminSupabase
    .from('order_items')
    .insert(orderItems.map(item => ({ ...item, order_id: order.id })))

  if (itemsError) {
    // Rollback order if items fail
    await adminSupabase.from('orders').delete().eq('id', order.id)
    return apiError('Failed to create order items')
  }

  // ── Create Razorpay order (if not COD) ───────────────────
  let razorpayOrder = null
  if (data.payment_method !== 'cod') {
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total * 100), // paise
        currency: 'INR',
        receipt: order.id,
        notes: {
          order_number: order.order_number,
          store: 'Goyal General Store',
        },
      })

      await adminSupabase
        .from('orders')
        .update({ razorpay_order_id: razorpayOrder.id })
        .eq('id', order.id)
    } catch {
      // Don't fail the order if Razorpay fails — let user retry payment
      console.error('Razorpay order creation failed')
    }
  } else {
    // COD: immediately confirm
    await adminSupabase
      .from('orders')
      .update({ status: 'confirmed', payment_status: 'pending' })
      .eq('id', order.id)
  }

  return apiSuccess({
    order_id:         order.id,
    order_number:     order.order_number,
    total:            total,
    razorpay_order:   razorpayOrder,
    payment_method:   data.payment_method,
  }, 201)
}
