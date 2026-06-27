// components/store/Footer.tsx
import Link from 'next/link'

const LINKS = {
  Store:    [['/', 'Home'], ['/#products', 'Shop'], ['/#offers', 'Offers'], ['/#about', 'About']],
  Account:  [['/login', 'Login'], ['/orders', 'My Orders'], ['/profile', 'Profile'], ['/checkout', 'Checkout']],
}

export default function Footer() {
  return (
    <footer id="about" className="bg-green-deep text-white">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-saffron rounded-xl flex items-center justify-center text-xl">🌿</div>
              <p className="font-display font-extrabold text-xl">Goyal General Store</p>
            </div>
            <p className="text-white/55 text-sm leading-relaxed max-w-xs">
              Your trusted neighbourhood kirana in Rohini, Delhi.
              Serving fresh groceries and daily essentials since 1998.
            </p>
            <div className="mt-5 space-y-1 text-sm text-white/55">
              <p>📍 Rohini, New Delhi — 110085</p>
              <p>📞 +91 98765 43210</p>
              <p>📧 hello@goyalstore.in</p>
              <p>⏰ Open daily 7 AM – 10 PM</p>
            </div>
          </div>

          {/* Nav links */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-display font-bold text-sm uppercase tracking-widest text-white/40 mb-4">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-white/65 hover:text-saffron transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment badges */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/35 text-xs">
            © {new Date().getFullYear()} Goyal General Store. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {['UPI', 'Cards', 'Net Banking', 'COD'].map(method => (
              <span
                key={method}
                className="text-xs font-semibold border border-white/15 text-white/50 px-2.5 py-1 rounded-lg"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
