'use client'
// app/(admin)/admin/layout.tsx — Shared admin shell
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Package, Warehouse,
  Users, Tag, Layers, ExternalLink, Menu, X, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders',    label: 'Orders',    icon: ShoppingBag },
  { href: '/admin/products',   label: 'Products',   icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Layers },
  { href: '/admin/inventory',  label: 'Inventory',  icon: Warehouse },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/coupons',   label: 'Coupons',   icon: Tag },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const Sidebar = () => (
    <nav className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-saffron rounded-xl flex items-center justify-center text-lg shrink-0">🌿</div>
        <div>
          <p className="font-display font-extrabold text-white text-sm leading-none">Goyal General</p>
          <p className="text-white/40 text-xs mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${active
                  ? 'bg-saffron text-green-deep'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <a
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <ExternalLink size={16} /> View Store
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-green-deep shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-green-deep flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-green-deep text-white sticky top-0 z-20">
          <button onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <p className="font-display font-bold text-sm">Admin Panel</p>
          <a href="/" target="_blank" className="text-white/60">
            <ExternalLink size={18} />
          </a>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
