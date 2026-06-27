'use client'
// app/(auth)/login/page.tsx — Phone OTP authentication
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, ArrowRight, Shield, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Step = 'phone' | 'otp'

function LoginForm() {
  const [step, setStep]         = useState<Step>('phone')
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(0)

  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') || '/'
  const supabase     = createClient()

  const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`

  const sendOTP = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: { shouldCreateUser: true },
      })

      if (error) throw error

      setStep('otp')
      toast.success('OTP sent to your mobile!')

      setCountdown(60)
      const interval = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(interval); return 0 }
          return c - 1
        })
      }, 1000)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      })

      if (error) throw error

      toast.success('Logged in successfully!')
      router.push(redirect)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-deep flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-green-muted/5" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-saffron/5" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-saffron rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
            🌿
          </div>
          <h1 className="font-display font-extrabold text-2xl text-white mb-1">
            Goyal General Store
          </h1>
          <p className="text-white/50 text-sm">Sign in to place orders</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 shadow-2xl">
          {step === 'phone' ? (
            <>
              <h2 className="font-display font-bold text-xl text-green-deep mb-1">Enter your number</h2>
              <p className="text-sm text-gray-500 mb-6">We&apos;ll send a 6-digit OTP to verify</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-cream rounded-xl border border-cream-dark text-sm font-medium text-gray-600">
                      🇮🇳 +91
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={e => e.key === 'Enter' && sendOTP()}
                      placeholder="98XXXXXXXX"
                      className="input-field flex-1"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>

                <button
                  onClick={sendOTP}
                  disabled={loading || phone.length !== 10}
                  className="w-full bg-green-deep text-white rounded-full py-3.5 text-sm font-semibold
                             flex items-center justify-center gap-2 hover:bg-green-mid transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <>Get OTP <ArrowRight size={15} /></>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('phone'); setOtp('') }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-deep mb-5 transition-colors"
              >
                ← Change number
              </button>

              <h2 className="font-display font-bold text-xl text-green-deep mb-1">Verify OTP</h2>
              <p className="text-sm text-gray-500 mb-6">
                Sent to <span className="font-medium text-green-deep">+91 {phone}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    6-digit OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                    placeholder="• • • • • •"
                    className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>

                <button
                  onClick={verifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-green-deep text-white rounded-full py-3.5 text-sm font-semibold
                             flex items-center justify-center gap-2 hover:bg-green-mid transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <span className="animate-spin">⟳</span> : <>Verify & Sign In <Shield size={14} /></>}
                </button>

                <button
                  onClick={sendOTP}
                  disabled={countdown > 0 || loading}
                  className="w-full text-sm text-green-light font-medium flex items-center justify-center gap-1.5
                             disabled:text-gray-400 disabled:cursor-not-allowed hover:text-green-deep transition-colors"
                >
                  <RotateCcw size={13} />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          By continuing you agree to our Terms of Service &amp; Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-green-deep flex items-center justify-center">
        <div className="w-14 h-14 bg-saffron/20 rounded-2xl animate-pulse" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
