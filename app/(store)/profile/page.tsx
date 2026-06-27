'use client'
// app/(store)/profile/page.tsx — Customer profile + addresses
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, MapPin } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  full_name: string | null
  phone: string | null
  email: string | null
}

export default function ProfilePage() {
  const router               = useRouter()
  const [profile, setProfile]= useState<Profile | null>(null)
  const [loading, setLoading]= useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/profile'); return }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
      {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-card" />)}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display font-extrabold text-3xl text-green-deep mb-6">My Profile</h1>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-green-deep rounded-2xl flex items-center justify-center">
            <User size={24} className="text-saffron" />
          </div>
          <div>
            <p className="font-display font-extrabold text-xl text-green-deep">
              {profile?.full_name || 'No name set'}
            </p>
            <p className="text-sm text-gray-400">{profile?.email || ''}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-3 border-b border-cream-dark">
            <span className="text-gray-500 font-medium">Name</span>
            <span className="text-green-deep font-semibold">{profile?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-cream-dark">
            <span className="text-gray-500 font-medium">Phone</span>
            <span className="text-green-deep font-semibold">{profile?.phone || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-500 font-medium">Email</span>
            <span className="text-green-deep font-semibold">{profile?.email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
        <Link
          href="/orders"
          className="flex items-center justify-between px-5 py-4 hover:bg-cream transition-colors border-b border-cream-dark"
        >
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-green-muted" />
            <span className="text-sm font-semibold text-green-deep">My Orders</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        <Link
          href="/shop"
          className="flex items-center justify-between px-5 py-4 hover:bg-cream transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🛒</span>
            <span className="text-sm font-semibold text-green-deep">Continue Shopping</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-red-200 text-red-600 rounded-2xl text-sm font-semibold hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} /> Logout
      </button>
    </div>
  )
}
