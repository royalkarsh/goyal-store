// app/not-found.tsx — Custom 404 page
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-green-deep rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-card">
        🌿
      </div>
      <h1 className="font-display font-extrabold text-6xl text-green-deep mb-2">404</h1>
      <p className="font-display font-bold text-xl text-green-deep mb-2">Page Not Found</p>
      <p className="text-gray-400 text-sm mb-8 max-w-xs">
        Looks like this aisle doesn't exist. Let's get you back to the store.
      </p>
      <Link
        href="/"
        className="btn-primary text-base px-8 py-4"
      >
        Back to Home
      </Link>
    </div>
  )
}
