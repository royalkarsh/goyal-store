'use client'
// components/store/SearchOverlay.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ArrowRight, TrendingUp, Mic, MicOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/types'

// Common Hindi grocery words → English search terms
// Used when speech recognition returns Devanagari script
const HINDI_MAP: Record<string, string> = {
  'आटा': 'atta', 'गेहूं': 'wheat', 'चावल': 'rice', 'चीनी': 'sugar',
  'नमक': 'salt', 'तेल': 'oil', 'सरसों': 'mustard', 'सरसों का तेल': 'mustard oil',
  'दाल': 'dal', 'चना': 'chana', 'मूंग': 'moong', 'उड़द': 'urad', 'मसूर': 'masoor',
  'चाय': 'tea', 'कॉफी': 'coffee', 'नेस्कैफे': 'nescafe', 'दूध': 'milk',
  'दही': 'curd', 'पनीर': 'paneer', 'मक्खन': 'butter', 'बटर': 'butter', 'घी': 'ghee',
  'ब्रेड': 'bread', 'बिस्कुट': 'biscuit', 'नमकीन': 'namkeen', 'चिप्स': 'chips',
  'मैगी': 'maggi', 'नूडल्स': 'noodles', 'पास्ता': 'pasta',
  'हल्दी': 'turmeric', 'मिर्च': 'chilli', 'धनिया': 'coriander',
  'जीरा': 'jeera', 'मसाला': 'masala', 'बेसन': 'besan', 'मैदा': 'maida',
  'सूजी': 'suji', 'पोहा': 'poha', 'राजमा': 'rajma',
  'साबुन': 'soap', 'शैंपू': 'shampoo', 'टूथपेस्ट': 'toothpaste',
  'अमूल': 'amul', 'टाटा': 'tata', 'पतंजलि': 'patanjali', 'डाबर': 'dabur',
  'कुरकुरे': 'kurkure', 'चॉकलेट': 'chocolate', 'जूस': 'juice',
  'केचप': 'ketchup', 'सॉस': 'sauce', 'अचार': 'pickle', 'पापड़': 'papad',
  'शक्कर': 'sugar', 'गुड़': 'jaggery',
}

function translateHindi(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text  // no Devanagari → return as-is
  const t = text.trim()
  if (HINDI_MAP[t]) return HINDI_MAP[t]
  // word-by-word fallback
  return t.split(/\s+/).map(w => HINDI_MAP[w] || w).join(' ')
}

const QUICK_SEARCHES = [
  { label: '🌾 Atta',  q: 'atta'  },
  { label: '🛢️ Oil',   q: 'oil'   },
  { label: '🥛 Dairy', q: 'dairy' },
  { label: '☕ Tea',   q: 'tea'   },
  { label: '🍜 Maggi', q: 'maggi' },
  { label: '🧂 Salt',  q: 'salt'  },
]

type VoiceState = 'idle' | 'listening' | 'unsupported'

interface Props {
  isOpen:  boolean
  onClose: () => void
}

export default function SearchOverlay({ isOpen, onClose }: Props) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<Product[]>([])
  const [loading,     setLoading]     = useState(false)
  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle')
  const [interim,     setInterim]     = useState('')   // live transcript preview

  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const router = useRouter()

  // Check Web Speech API support once
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setVoiceState('unsupported')
  }, [])

  useEffect(() => {
    if (isOpen)  setTimeout(() => inputRef.current?.focus(), 80)
    else {
      setQuery('')
      stopListening()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const stopListening = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setVoiceState(v => v === 'listening' ? 'idle' : v)
    setInterim('')
  }

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    stopListening()

    const recognition = new SR()
    recognition.lang            = 'en-IN'   // Indian English — returns "atta", "dal", "Amul" in Latin script
    recognition.interimResults  = true
    recognition.maxAlternatives = 1
    recognition.continuous      = false

    recognition.onstart = () => { setVoiceState('listening'); setInterim('') }

    recognition.onresult = (e: any) => {
      let final = ''
      let live  = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else                       live  += e.results[i][0].transcript
      }
      if (final) {
        setQuery(q => (q + ' ' + translateHindi(final)).trim())
        setInterim('')
      } else {
        setInterim(translateHindi(live))
      }
    }

    recognition.onerror = () => stopListening()
    recognition.onend   = ()  => { setVoiceState('idle'); setInterim('') }

    recognitionRef.current = recognition
    recognition.start()
  }

  const toggleVoice = () => {
    if (voiceState === 'listening') stopListening()
    else startListening()
  }

  const handleSelect = (product: Product) => {
    onClose()
    router.push(`/products/${product.slug}`)
  }

  if (!isOpen) return null

  const displayValue = voiceState === 'listening' && interim ? interim : query
  const placeholder  = voiceState === 'listening'
    ? 'सुन रहा हूँ… बोलिए'
    : 'Search atta, dal, oil, snacks…'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(13,40,24,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl mx-4 animate-fade-in">
        {/* Input row */}
        <div className={`flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-2xl transition-all duration-200
          ${voiceState === 'listening' ? 'ring-2 ring-red-400' : ''}`}>
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={displayValue}
            onChange={e => { if (voiceState !== 'listening') setQuery(e.target.value) }}
            placeholder={placeholder}
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
            className="bg-cream-dark hover:bg-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Mic button — large standalone, easy to tap on phone */}
        {voiceState !== 'unsupported' && (
          <div className="flex flex-col items-center mt-5">
            <button
              onPointerDown={e => { e.stopPropagation(); toggleVoice() }}
              aria-label={voiceState === 'listening' ? 'Stop listening' : 'Search by voice'}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95
                ${voiceState === 'listening'
                  ? 'bg-red-500 text-white scale-110 shadow-red-500/40'
                  : 'bg-white text-green-deep hover:bg-saffron'}`}
            >
              {voiceState === 'listening'
                ? <MicOff size={26} />
                : <Mic size={26} />}
            </button>

            {voiceState === 'listening' ? (
              <div className="mt-3 flex items-center gap-2 text-white/90 text-sm">
                <span className="flex gap-1 items-end">
                  {[...Array(4)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 bg-saffron rounded-full animate-bounce"
                      style={{ height: `${10 + i * 4}px`, animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </span>
                <span>बोलिए… <span className="text-white/50 text-xs">Bol dijiye</span></span>
              </div>
            ) : (
              <p className="mt-2 text-white/50 text-xs">Tap mic &amp; speak</p>
            )}
          </div>
        )}

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
                      <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center shrink-0 overflow-hidden">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">{product.emoji || '📦'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-deep truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">
                          {[product.brand, product.weight].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="font-display font-bold text-green-deep shrink-0">₹{product.price}</span>
                      <ArrowRight size={14} className="text-gray-300 shrink-0" />
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

        {/* Quick searches (shown when no query and not listening) */}
        {!query && voiceState !== 'listening' && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-white/50" />
              <span className="text-white/50 text-xs font-medium">Popular searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map(({ label, q }) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
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
