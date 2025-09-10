"use client"

import React from 'react'

export default function CopyAllEmails({ apiPath, label = 'Copy emails (all)', className = '' }: { apiPath: string; label?: string; className?: string }) {
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const onCopyAll = async () => {
    try {
      setLoading(true)
      const res = await fetch(apiPath, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = (await res.json()) as { emails: string[] }
      const text = (data.emails || []).join(', ')
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={onCopyAll} disabled={loading} className={["px-2 py-1 rounded border text-sm", className, loading ? 'opacity-70' : ''].join(' ')}>
      {copied ? 'Copied!' : (loading ? 'Loading…' : label)}
    </button>
  )
}
