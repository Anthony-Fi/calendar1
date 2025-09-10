"use client"

import React from 'react'
import { signIn } from 'next-auth/react'
import TurnstileWidget from './TurnstileWidget'

export default function PasswordlessLoginForm({ locale, siteKey }: { locale: 'en' | 'sv' | 'fi'; siteKey?: string }) {
  const [email, setEmail] = React.useState('')
  const [token, setToken] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) { setError('Please enter your email'); return }
    if (siteKey && !token) { setError('Please complete the CAPTCHA'); return }
    try {
      setLoading(true)
      // Client-side check only; for stronger security, add server-side verification in a custom route
      const res = await signIn('email', {
        redirect: false,
        callbackUrl: `/${locale}`,
        email,
      })
      if (res?.error) throw new Error(res.error)
      setDone(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  if (done) return <div className="text-sm text-green-700">Check your email for a sign-in link.</div>

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1" htmlFor="pl_email">Email</label>
        <input id="pl_email" type="email" className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {!!siteKey && (
        <TurnstileWidget siteKey={siteKey} onToken={setToken} className="my-2" />
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" className="px-4 py-2 rounded border bg-white" disabled={loading}>
        {loading ? 'Sending…' : 'Send login link'}
      </button>
    </form>
  )
}
