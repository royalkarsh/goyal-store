'use client'
// components/store/Hero.tsx
import { useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import SearchOverlay from './SearchOverlay'

const FLOATERS = [
  { emoji: '🥛', name: 'Fresh Milk',    price: '₹52',  top: '18%', left: '8%',  anim: 'animate-float1' },
  { emoji: '🌾', name: 'Basmati Rice',  price: '₹120', top: '14%', left: '72%', anim: 'animate-float2' },
  { emoji: '🫙', name: 'Mustard Oil',   price: '₹185', top: '58%', left: '6%',  anim: 'animate-float3' },
  { emoji: '🫖', name: 'Tata Tea',      price: '₹62',  top: '62%', left: '72%', anim: 'animate-float1' },
  { emoji: '🧈', name: 'Amul Butter',   price: '₹58',  top: '78%', left: '42%', anim: 'animate-float2' },
]

export default function Hero() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <section className="relative min-h-[100svh] bg-green-deep overflow-hidden flex flex-col items-center justify-center px-6 pt-28 pb-16">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)', backgroundSize: '36px 36px' }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-green-light/10 blur-3xl pointer-events-none" />

        {/* Floating product cards — desktop only */}
        {FLOATERS.map((f, i) => (
          <div
            key={i}
            className={`absolute hidden lg:flex flex-col items-center gap-1
              bg-white/8 backdrop-blur border border-white/15 rounded-2xl px-4 py-3 text-white ${f.anim}`}
            style={{ top: f.top, left: f.left }}
          >
            <span className="text-3xl">{f.emoji}</span>
            <p className="text-xs font-medium opacity-80">{f.name}</p>
            <p className="text-xs font-bold text-saffron">{f.price}</p>
          </div>
        ))}

        {/* Pulsing badge */}
        <div className="flex items-center gap-2.5 bg-green-muted/15 border border-green-muted/30 rounded-full px-5 py-2 mb-8">
          <span className="w-2.5 h-2.5 bg-green-muted rounded-full animate-pulse-ring shrink-0" />
          <span className="text-green-muted text-sm font-semibold">Now delivering in Anpara &amp; nearby areas</span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] mb-5 max-w-4xl">
          Goyal General Store
          <span className="block text-saffron mt-1">Fresh. Local. Fast.</span>
        </h1>
        <p className="text-white/55 text-center text-lg mb-10 max-w-lg leading-relaxed">
          Your trusted neighbourhood kirana in Anpara — daily essentials delivered fresh to your door in Anpara Colony, Renusagar, Auri More, Kashi More &amp; more.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-14">
          <a
            href="#products"
            className="inline-flex items-center justify-center gap-2 bg-saffron text-green-deep font-semibold text-base px-8 py-4 rounded-full
                       transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-saffron/30 active:scale-95"
          >
            Shop Now →
          </a>
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/75 font-medium text-base px-8 py-4 rounded-full
                       transition-all duration-200 hover:border-white/50 hover:text-white"
          >
            <Search size={17} /> Search products
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-10">
          {[['500+', 'Products'], ['30 min', 'Avg delivery'], ['4.8 ★', 'Rating']].map(([val, label]) => (
            <div key={label} className="text-center">
              <p className="font-display font-extrabold text-xl text-saffron">{val}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/25 animate-bounce">
          <ChevronDown size={22} />
        </div>
      </section>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
