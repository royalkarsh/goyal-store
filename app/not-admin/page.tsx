// app/not-admin/page.tsx — Shown when a logged-in user hits /admin without admin role
import Link from 'next/link'

export default function NotAdminPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-green-deep rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-card">
        🔒
      </div>
      <h1 className="font-display font-extrabold text-3xl text-green-deep mb-2">
        Admin Access Required
      </h1>
      <p className="text-gray-500 text-base mb-2 max-w-md">
        Your account does not have admin permissions.
      </p>
      <p className="text-sm text-gray-400 mb-8 max-w-md bg-white rounded-2xl p-4 shadow-card border border-cream-dark">
        To grant yourself admin access, go to your{' '}
        <strong>Supabase Dashboard → SQL Editor</strong> and run:<br /><br />
        <code className="bg-cream rounded px-2 py-0.5 text-xs text-green-deep font-mono block mt-1 text-left">
          UPDATE profiles SET role = &apos;admin&apos;<br />
          WHERE id = (SELECT id FROM auth.users<br />
          &nbsp;&nbsp;WHERE phone = &apos;+91XXXXXXXXXX&apos; LIMIT 1);
        </code>
        <span className="block mt-2">Replace with your phone number (+91 format). Then log out and log back in.</span>
      </p>
      <Link href="/" className="btn-primary px-8 py-3">
        Back to Store
      </Link>
    </div>
  )
}
