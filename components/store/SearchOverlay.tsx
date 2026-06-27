'use client'
// components/store/SearchOverlay.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ArrowRight, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/types'

const QUICK_SEARCHES = [
  { label: '🌾 Atta', q: 'atta' },
  { label: '🛢️ Oil', q: 'oil' },
  { label: '🥛 Dairy', q: 'dairy' },
  { label: '☕ Tea', q: 'tea' },
  { label: '🍜 Maggi', q: 'maggi' },
  { label: '🧂 Salt', q: 'salt' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SearchOverlay({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80)
    else setQuery('')
  }, [isOpen])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`)
      const { data } = await res.json()
      setResults(data?.products || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300)
    return () => clearTimeout(timeout)
  }, [query, search])

  const handleSelect = (product: Product) => {
    onClose()
    router.push(`/products/${product.slug}`)
  }

  const handleQuick = (q: string) => {
    setQuery(q)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(13,40,24,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl mx-4 animate-fade-in">
        {/* Input */}
        <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-2xl">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search atta, dal, oil, snacks…"
            className="flex-1 text-base text-green-deep placeholder:text-gray-400 outline-none bg-transparent"
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && query) {
                onClose()
                router.push(`/shop?search=${encodeURIComponent(query)}`)
              }
            }}
          />
          <button
            onClick={onClose}
            className="bg-cream-dark hover:bg-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        {query && (
          <div className="mt-3 bg-white rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">
                No results for &quot;{query}&quot;
              </div>
            ) : (
              <ul>
                {results.map(product => (
                  <li key={product.id}>
                    <button
                      onClick={() => handleSelect(product)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-cream transition-colors text-left"
                    >
                      <span className="text-2xl w-8 text-center">{product.emoji || '📦'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-deep">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.weight}</p>
                      </div>
                      <span className="font-display font-bold text-green-deep">₹{product.price}</span>
                      <ArrowRight size={14} className="text-gray-300" />
                    </button>
                  </li>
                ))}
                <li className="border-t border-cream-dark">
                  <button
                    onClick={() => { onClose(); router.push(`/shop?search=${encodeURIComponent(query)}`) }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-green-light hover:bg-cream transition-colors"
                  >
                    View all results for &quot;{query}&quot; →
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}

        {/* Quick searches (shown when no query) */}
        {!query && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-white/50" />
              <span className="text-white/50 text-xs font-medium">Popular searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map(({ label, q }) => (
                <button
                  key={q}
                  onClick={() => handleQuick(q)}
                  className="bg-white/15 hover:bg-saffron hover:text-green-deep text-white border border-white/25
                             rounded-full px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
