'use client'
// components/store/PromoBanners.tsx
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

function CouponCard({
  bg, headline, sub, code, light,
}: {
  bg: string; headline: string; sub: string; code: string; light?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      toast.success(`Coupon "${code}" copied!`)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={`${bg} rounded-3xl p-7 flex flex-col justify-between min-h-[180px] relative overflow-hidden`}>
      {/* Decorative circle */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div>
        <p className={`font-display font-extrabold text-xl mb-1 ${light ? 'text-green-deep' : 'text-white'}`}>
          {headline}
        </p>
        <p className={`text-sm ${light ? 'text-green-deep/70' : 'text-white/70'}`}>{sub}</p>
      </div>

      <button
        onClick={copy}
        className={`flex items-center gap-2 self-start mt-4 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200
          ${light
            ? 'bg-green-deep text-white hover:bg-green-mid'
            : 'bg-white text-green-deep hover:bg-cream'}`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {code}
      </button>
    </div>
  )
}

export default function PromoBanners() {
  return (
    <section id="offers" className="max-w-6xl mx-auto px-4 py-6">
      <p className="section-label">Special Offers</p>
      <h2 className="section-title">Deals Just for You</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <CouponCard
          bg="bg-green-deep"
          headline="First Order? 10% Off"
          sub="Use code at checkout. New customers only. Min. order ₹199."
          code="GOYAL10"
        />
        <CouponCard
          bg="bg-saffron"
          headline="Free Delivery Above ₹299"
          sub="No code needed — free delivery applied automatically at checkout."
          code="FREE299"
          light
        />
      </div>
    </section>
  )
}
