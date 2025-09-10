"use client"

import React from 'react'

export default function ShareButtons({ title, url, className = '' }: { title: string; url: string; className?: string }) {
  async function doShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard')
    } catch {
      prompt('Copy this link:', url)
    }
  }

  return (
    <button type="button" onClick={doShare} className={`px-2 py-1 rounded border text-sm hover:bg-gray-50 ${className}`} aria-label="Share">
      Share
    </button>
  )
}
