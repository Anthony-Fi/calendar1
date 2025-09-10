"use client"

import React from 'react'

export default function CopySelectedEmails({ containerId, label = 'Copy selected emails', className = '' }: { containerId: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)
  const onCopy = async () => {
    const root = document.getElementById(containerId)
    const rows = Array.from(root?.querySelectorAll('tbody tr') || []) as HTMLTableRowElement[]
    const emails = rows
      .filter((tr) => {
        const cb = tr.querySelector('input[type="checkbox"]') as HTMLInputElement | null
        return cb?.checked
      })
      .map((tr) => tr.getAttribute('data-email') || '')
      .filter(Boolean)
      .join(', ')
    try {
      await navigator.clipboard.writeText(emails)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = emails
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }
  return (
    <button type="button" onClick={onCopy} className={["px-2 py-1 rounded border text-sm", className].join(' ')}>
      {copied ? 'Copied!' : label}
    </button>
  )
}
