"use client"

import React from 'react'

export default function GeneratePasswordButton({ userId }: { userId: string }) {
  const [loading, setLoading] = React.useState(false)
  const [pwd, setPwd] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const onGenerate = async () => {
    setError(null)
    setPwd(null)
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users/generate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { password: string }
      setPwd(data.password)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate password')
    } finally {
      setLoading(false)
    }
  }

  const onCopy = async () => {
    if (!pwd) return
    try {
      await navigator.clipboard.writeText(pwd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onGenerate} disabled={loading} className="px-2 py-1 rounded border text-xs">
        {loading ? 'Generating…' : 'Generate password'}
      </button>
      {pwd && (
        <div className="flex items-center gap-2 text-xs">
          <code className="px-1 py-0.5 bg-gray-100 rounded border">{pwd}</code>
          <button type="button" onClick={onCopy} className="underline">{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
