'use client'
// components/admin/BarcodeScanner.tsx — Camera + manual barcode lookup
import { useEffect, useRef, useState } from 'react'
import { X, Camera, Keyboard, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

export interface BarcodeProductData {
  name:          string | null
  brand:         string | null
  weight:        string | null
  image_url:     string | null
  emoji:         string
  category_slug: string
  barcode:       string
}

interface Props {
  onFound:        (data: BarcodeProductData) => void
  onClose:        () => void
  onFillManually?: () => void  // if provided, "Fill Manually" calls this instead of just closing
}

type ScanState = 'idle' | 'scanning' | 'fetching' | 'found' | 'not_found'

export default function BarcodeScanner({ onFound, onClose, onFillManually }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode,       setMode]       = useState<'camera' | 'manual'>('camera')
  const [scanState,  setScanState]  = useState<ScanState>('scanning')
  const [result,     setResult]     = useState<BarcodeProductData | null>(null)
  const [manualCode, setManualCode] = useState('')
  const fetchingRef  = useRef(false)

  // ── Start camera ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'camera' || scanState !== 'scanning') return

    let cancelled = false

    const start = async () => {
      try {
        // getUserMedia always shows the browser permission prompt
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-api')

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        if (!videoRef.current) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream

        const { BrowserMultiFormatReader } = await import('@zxing/library')
        if (cancelled) return

        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        // decodeFromStream attaches the stream to the video element and scans continuously
        await reader.decodeFromStream(stream, videoRef.current, (res) => {
          if (res && !fetchingRef.current) lookup(res.getText())
        })
      } catch (err: any) {
        if (cancelled) return
        setMode('manual')
        if (err?.name === 'NotAllowedError') {
          toast.error('Camera permission denied — enter barcode manually')
        } else {
          toast('No camera available — enter barcode manually', { icon: '⌨️' })
        }
      }
    }

    start()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [mode, scanState])

  const stopCamera = () => {
    if (readerRef.current) {
      try { readerRef.current.reset() } catch { /* ignore */ }
      readerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const lookup = async (code: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    stopCamera()
    setScanState('fetching')

    try {
      const res  = await fetch(`/api/admin/barcode/${code}`)
      const json = await res.json()
      if (res.ok && json.data) {
        setResult(json.data)
        setScanState('found')
      } else {
        setScanState('not_found')
      }
    } catch {
      setScanState('not_found')
    } finally {
      fetchingRef.current = false
    }
  }

  const handleManual = () => {
    const code = manualCode.trim()
    if (!/^\d{8,14}$/.test(code)) {
      toast.error('Enter 8–14 digit barcode number')
      return
    }
    lookup(code)
  }

  const reset = () => {
    setResult(null)
    setManualCode('')
    setScanState('scanning')
  }

  const handleClose = () => { stopCamera(); onClose() }
  const handleConfirm = () => { if (result) onFound(result) }
  const handleFillManually = () => { stopCamera(); onFillManually ? onFillManually() : onClose() }

  const switchToManual = () => { stopCamera(); setMode('manual') }
  const switchToCamera = () => { setScanState('scanning'); setMode('camera') }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
      <div className="bg-green-deep rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <p className="font-display font-bold text-white text-lg">
            {scanState === 'found' ? '✓ Product Found' :
             scanState === 'not_found' ? '✗ Not Found' : '📷 Scan Barcode'}
          </p>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Mode toggle — only while scanning */}
          {(scanState === 'scanning' || scanState === 'idle') && (
            <div className="flex gap-2">
              <button
                onClick={switchToCamera}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${mode === 'camera' ? 'bg-saffron text-green-deep' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
              >
                <Camera size={15} /> Camera
              </button>
              <button
                onClick={switchToManual}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${mode === 'manual' ? 'bg-saffron text-green-deep' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
              >
                <Keyboard size={15} /> Manual
              </button>
            </div>
          )}

          {/* Camera view */}
          {mode === 'camera' && scanState === 'scanning' && (
            <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

              {/* Corner guides */}
              <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-saffron rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-saffron rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-saffron rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-saffron rounded-br-lg" />

              {/* Scan line */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-saffron shadow-lg animate-scan-line"
                   style={{ boxShadow: '0 0 8px #F5A623' }} />

              <div className="absolute inset-x-0 bottom-3 text-center">
                <p className="text-white/60 text-xs">Hold barcode steady in frame</p>
              </div>
            </div>
          )}

          {/* Manual input */}
          {mode === 'manual' && scanState === 'scanning' && (
            <div className="space-y-3">
              <p className="text-white/60 text-sm">Enter the barcode number printed below the stripes</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  onKeyDown={e => e.key === 'Enter' && handleManual()}
                  placeholder="e.g. 8901030860306"
                  className="flex-1 bg-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm border border-white/15 focus:outline-none focus:border-saffron transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleManual}
                  className="px-4 bg-saffron text-green-deep rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shrink-0"
                >
                  Go
                </button>
              </div>
            </div>
          )}

          {/* Fetching */}
          {scanState === 'fetching' && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 border-2 border-saffron border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Looking up product info…</p>
            </div>
          )}

          {/* Found */}
          {scanState === 'found' && result && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white/10 rounded-2xl p-4 flex gap-3">
                {result.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.image_url}
                    alt={result.name || ''}
                    className="w-16 h-16 object-contain rounded-xl bg-white/5 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-3xl shrink-0">
                    {result.emoji}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm leading-snug mb-1">
                    {result.name || <span className="text-white/40 italic">Unknown name</span>}
                  </p>
                  {result.brand  && <p className="text-white/60 text-xs mb-0.5">{result.brand}</p>}
                  {result.weight && <p className="text-white/40 text-xs mb-1">{result.weight}</p>}
                  <span className="inline-block bg-saffron/20 text-saffron text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                    {result.category_slug}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 border border-white/20 text-white/60 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  <RotateCcw size={14} /> Scan Again
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-saffron text-green-deep rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Use This Product →
                </button>
              </div>
            </div>
          )}

          {/* Not found */}
          {scanState === 'not_found' && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div>
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-white font-semibold mb-1">Product not found</p>
                <p className="text-white/45 text-sm">
                  This barcode isn&apos;t in Open Food Facts. Fill the form manually.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex-1 py-3 border border-white/20 text-white/60 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleFillManually}
                  className="flex-1 py-3 bg-saffron text-green-deep rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Fill Manually
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
