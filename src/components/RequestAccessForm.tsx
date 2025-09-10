"use client"

import React from 'react'
import TurnstileWidget from './TurnstileWidget'

export default function RequestAccessForm({ locale, siteKey }: { locale: 'en' | 'sv' | 'fi'; siteKey?: string }) {
  const [form, setForm] = React.useState({ name: '', group: '', location: '', email: '', consent: false })
  const [token, setToken] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.consent) { setError('Please consent to email updates to proceed.'); return }
    try {
      setLoading(true)
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDone(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  if (done) return <div className="text-sm text-green-700">Thanks! Your request has been received. We will contact you by email.</div>

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1" htmlFor="ra_name">Name</label>
        <input id="ra_name" className="w-full border rounded px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="ra_group">Group</label>
        <input id="ra_group" className="w-full border rounded px-3 py-2" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="ra_location">Location</label>
        <input id="ra_location" className="w-full border rounded px-3 py-2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="ra_email">Email</label>
        <input id="ra_email" type="email" className="w-full border rounded px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        I consent to receive email updates.
      </label>
      {!!siteKey && (
        <TurnstileWidget siteKey={siteKey} onToken={setToken} className="my-2" />
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" className="px-4 py-2 rounded border bg-white" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
