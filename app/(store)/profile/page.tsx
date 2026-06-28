'use client'
// app/(store)/profile/page.tsx — Customer profile with inline editing
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, Edit2, Check, X, ShoppingBag, Store } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Profile {
  full_name: string | null
  phone:     string | null
  email:     string | null
}

type EditingField = 'full_name' | 'email' | null

export default function ProfilePage() {
  const router = useRouter()

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [editing,  setEditing]  = useState<EditingField>(null)
  const [draftVal, setDraftVal] = useState('')

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

  const startEdit = (field: EditingField) => {
    if (!field) return
    setEditing(field)
    setDraftVal(profile?.[field] || '')
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraftVal('')
  }

  const saveField = async () => {
    if (!editing) return

    // Validate
    if (editing === 'full_name' && draftVal.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    if (editing === 'email' && draftVal.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftVal.trim())) {
      toast.error('Enter a valid email address')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const value = draftVal.trim() || null
      const { error } = await supabase
        .from('profiles')
        .update({ [editing]: value })
        .eq('id', user.id)

      if (error) throw error

      setProfile(prev => prev ? { ...prev, [editing]: value } : prev)
      toast.success('Saved!')
      setEditing(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-card" />)}
    </div>
  )

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display font-extrabold text-3xl text-green-deep mb-6">My Profile</h1>

      {/* Avatar + name */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-green-deep rounded-2xl flex items-center justify-center shrink-0">
            {profile?.full_name ? (
              <span className="font-display font-extrabold text-xl text-saffron">{initials}</span>
            ) : (
              <User size={26} className="text-saffron" />
            )}
          </div>
          <div>
            <p className="font-display font-extrabold text-xl text-green-deep leading-tight">
              {profile?.full_name || <span className="text-gray-400 font-normal text-base">No name added</span>}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{profile?.phone || ''}</p>
          </div>
        </div>

        <div className="space-y-1">
          {/* Name row */}
          <FieldRow
            label="Name"
            value={profile?.full_name}
            placeholder="Add your name"
            isEditing={editing === 'full_name'}
            draftVal={draftVal}
            saving={saving}
            onEdit={() => startEdit('full_name')}
            onCancel={cancelEdit}
            onSave={saveField}
            onChange={setDraftVal}
            inputType="text"
            autoComplete="name"
          />

          {/* Phone row — read only (set via OTP) */}
          <div className="flex items-center justify-between py-3.5 border-b border-cream-dark">
            <span className="text-sm text-gray-500 font-medium w-20 shrink-0">Phone</span>
            <span className="text-sm text-green-deep font-semibold flex-1 text-right">
              {profile?.phone || '—'}
            </span>
            <div className="w-7 ml-3" /> {/* spacer to align with editable rows */}
          </div>

          {/* Email row */}
          <FieldRow
            label="Email"
            value={profile?.email}
            placeholder="Add your email"
            isEditing={editing === 'email'}
            draftVal={draftVal}
            saving={saving}
            onEdit={() => startEdit('email')}
            onCancel={cancelEdit}
            onSave={saveField}
            onChange={setDraftVal}
            inputType="email"
            autoComplete="email"
            isLast
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
        <Link href="/orders"
          className="flex items-center justify-between px-5 py-4 hover:bg-cream transition-colors border-b border-cream-dark">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-green-muted" />
            <span className="text-sm font-semibold text-green-deep">My Orders</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        <Link href="/shop"
          className="flex items-center justify-between px-5 py-4 hover:bg-cream transition-colors">
          <div className="flex items-center gap-3">
            <Store size={18} className="text-green-muted" />
            <span className="text-sm font-semibold text-green-deep">Continue Shopping</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-red-200 text-red-500 rounded-2xl text-sm font-semibold hover:bg-red-50 transition-colors">
        <LogOut size={16} /> Logout
      </button>
    </div>
  )
}

// ── Inline-editable field row ─────────────────────────────────
interface FieldRowProps {
  label:        string
  value:        string | null | undefined
  placeholder:  string
  isEditing:    boolean
  draftVal:     string
  saving:       boolean
  onEdit:       () => void
  onCancel:     () => void
  onSave:       () => void
  onChange:     (v: string) => void
  inputType:    string
  autoComplete: string
  isLast?:      boolean
}

function FieldRow({
  label, value, placeholder, isEditing, draftVal, saving,
  onEdit, onCancel, onSave, onChange, inputType, autoComplete, isLast,
}: FieldRowProps) {
  return (
    <div className={`py-3.5 ${!isLast ? 'border-b border-cream-dark' : ''}`}>
      {isEditing ? (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            {label}
          </label>
          <div className="flex gap-2">
            <input
              type={inputType}
              value={draftVal}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
              autoComplete={autoComplete}
              autoFocus
              className="input-field flex-1 text-sm"
              placeholder={placeholder}
            />
            <button
              onClick={onSave}
              disabled={saving}
              className="w-9 h-9 bg-green-deep text-white rounded-xl flex items-center justify-center hover:bg-green-mid transition-colors disabled:opacity-50 shrink-0"
            >
              {saving ? <span className="text-xs animate-spin">⟳</span> : <Check size={15} />}
            </button>
            <button
              onClick={onCancel}
              className="w-9 h-9 border border-cream-dark text-gray-400 rounded-xl flex items-center justify-center hover:bg-cream transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium w-20 shrink-0">{label}</span>
          <span className={`text-sm flex-1 text-right mr-3 ${value ? 'text-green-deep font-semibold' : 'text-gray-300 italic'}`}>
            {value || placeholder}
          </span>
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-green-deep hover:bg-cream rounded-lg transition-colors shrink-0"
            title={`Edit ${label}`}
          >
            <Edit2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
