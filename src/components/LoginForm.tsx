"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginForm({ locale }: { locale: 'en' | 'sv' | 'fi' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        redirect: false,
        callbackUrl: `/${locale}`,
        email,
        password,
      })
      if (res?.error) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }
      const url = res?.url || `/${locale}`
      window.location.href = url
    } catch (err) {
      setError('Sign in failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required className="w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
