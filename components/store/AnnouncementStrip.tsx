// components/store/AnnouncementStrip.tsx
const MESSAGES = [
  '🚚 Free delivery on orders above ₹299',
  '🎉 First order? Use GOYAL10 for 10% off',
  '📍 Delivering to Anpara Colony, Renusagar, Auri More, Kashi More & nearby areas',
  '💳 Pay via UPI, Card, or Cash on Delivery',
  '⏰ Open daily 9 AM – 10 PM',
  '📞 Call us: +91 94156 76421',
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
