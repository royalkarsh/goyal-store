'use client'
// app/(store)/order-confirmation/page.tsx
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

function Confirmation() {
  const sp           = useSearchParams()
  const orderNumber  = sp.get('order_number') || '—'
  const orderId      = sp.get('order_id')     || ''

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Animated checkmark */}
      <div className="w-20 h-20 bg-green-deep rounded-full flex items-center justify-center mb-6 animate-fade-in">
        <CheckCircle2 size={40} className="text-saffron" />
      </div>

      <h1 className="font-display font-extrabold text-3xl text-green-deep mb-2 animate-fade-in">
        Order Placed! 🎉
      </h1>
      <p className="text-gray-500 text-base mb-1 animate-fade-in">
        Thank you for shopping with Goyal General Store
      </p>
      <p className="font-display font-bold text-lg text-saffron mb-8 animate-fade-in">
        Order #{orderNumber}
      </p>

      <div className="bg-white rounded-2xl shadow-card p-5 mb-8 max-w-sm w-full animate-fade-in">
        <p className="text-sm text-gray-600 mb-3">
          We&apos;ve received your order and will prepare it shortly.
          Estimated delivery: <span className="font-semibold text-green-deep">30–60 minutes</span>
        </p>
        <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3">
          <span className="text-green-600 text-lg">📦</span>
          <p className="text-sm text-green-700 font-medium">
            You&apos;ll get an update when your order is out for delivery
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="btn-primary px-8 py-3"
          >
            Track Order
          </Link>
        )}
        <Link
          href="/shop"
          className="btn-ghost px-8 py-3 border border-green-deep/30 text-green-deep hover:bg-green-deep hover:text-white"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><span className="text-green-deep animate-pulse font-display font-bold">Loading…</span></div>}>
      <Confirmation />
    </Suspense>
  )
}
