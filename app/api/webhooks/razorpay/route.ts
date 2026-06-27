// app/api/webhooks/razorpay/route.ts — Razorpay webhook handler
// Verifies webhook signature before processing any payment event

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature } from '@/lib/security'
import crypto from 'crypto'

// Razorpay sends webhook secret in X-Razorpay-Signature header
function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  )
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()

  // ── Verify webhook authenticity ───────────────────────────
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Invalid Razorpay webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  // ── Handle payment events ─────────────────────────────────
  switch (event.event) {
    case 'payment.captured': {
      const payment = event.payload.payment.entity
      const razorpayOrderId = payment.order_id

      // Find our order by Razorpay order ID
      const { data: order } = await adminSupabase
        .from('orders')
        .select('id, payment_status')
        .eq('razorpay_order_id', razorpayOrderId)
        .single()

      if (!order) break

      // Idempotency: don't process twice
      if (order.payment_status === 'paid') break

      await adminSupabase
        .from('orders')
        .update({
          payment_status:       'paid',
          status:               'confirmed',
          razorpay_payment_id:  payment.id,
          confirmed_at:         new Date().toISOString(),
        })
        .eq('id', order.id)

      break
    }

    case 'payment.failed': {
      const payment = event.payload.payment.entity
      await adminSupabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('razorpay_order_id', payment.order_id)
      break
    }

    case 'refund.processed': {
      const refund = event.payload.refund.entity
      await adminSupabase
        .from('orders')
        .update({ payment_status: 'refunded', status: 'refunded' })
        .eq('razorpay_payment_id', refund.payment_id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
