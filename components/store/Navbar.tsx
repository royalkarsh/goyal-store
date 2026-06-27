'use client'
// components/store/Navbar.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search, Menu, X, User } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import SearchOverlay from './SearchOverlay'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const { getItemCount, toggleCart } = useCartStore()
  const itemCount = getItemCount()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-6xl z-50
          glass rounded-full px-5 py-3 flex items-center justify-between gap-4
          transition-all duration-300 ${scrolled ? 'top-2 shadow-nav' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 text-white font-display font-extrabold text-lg shrink-0">
          <div className="w-8 h-8 bg-saffron rounded-xl flex items-center justify-center text-base">
            🌿
          </div>
          <span className="hidden sm:block">Goyal General</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-7 list-none">
          {[['/', 'Home'], ['/#products', 'Shop'], ['/#offers', 'Offers'], ['/#about', 'About']].map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                className="text-white/70 text-sm font-medium hover:text-saffron transition-colors duration-200"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors duration-200"
            aria-label="Search products (Ctrl+K)"
          >
            <Search size={15} />
          </button>

          {/* Account */}
          <Link
            href="/profile"
            className="hidden sm:flex w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors duration-200"
            aria-label="My account"
          >
            <User size={15} />
          </Link>

          {/* Cart */}
          <button
            onClick={toggleCart}
            className="flex items-center gap-2 bg-saffron text-green-deep rounded-full px-4 py-2 text-sm font-semibold hover:bg-saffron-light active:scale-95 transition-all duration-200"
            aria-label={`Cart, ${itemCount} items`}
          >
            <ShoppingCart size={15} />
            <span className="hidden sm:block">Cart</span>
            {itemCount > 0 && (
              <span className="bg-green-deep text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-green-deep/95 flex flex-col items-center justify-center gap-8 md:hidden">
          {[['/', 'Home'], ['/shop', 'Shop'], ['/offers', 'Offers'], ['/orders', 'My Orders'], ['/profile', 'Profile']].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="text-white font-display font-bold text-3xl hover:text-saffron transition-colors"
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => setMobileOpen(false)}
            className="mt-8 text-white/50 text-sm"
          >
            Close ✕
          </button>
        </div>
      )}

      {/* Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
