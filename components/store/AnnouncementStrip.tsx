// components/store/AnnouncementStrip.tsx
const MESSAGES = [
  '🚚 Free delivery on orders above ₹299',
  '🎉 First order? Use GOYAL10 for 10% off',
  '⚡ Same-day delivery available',
  '💳 Pay via UPI, Card, or Cash on Delivery',
  '🌿 500+ fresh products always in stock',
  '📦 Quality guaranteed on every order',
]

export default function AnnouncementStrip() {
  const text = MESSAGES.join('   •   ')
  return (
    <div className="bg-saffron overflow-hidden py-2.5" aria-label="Announcements">
      <div className="flex animate-marquee whitespace-nowrap will-change-transform">
        <span className="text-green-deep text-sm font-semibold shrink-0 px-4">{text}</span>
        <span className="text-green-deep text-sm font-semibold shrink-0 px-4" aria-hidden>{text}</span>
      </div>
    </div>
  )
}
