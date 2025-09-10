"use client"

import { useEffect } from 'react'

export default function TzSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    try {
      const url = new URL(window.location.href)
      if (!url.searchParams.get('tz') && tz) {
        url.searchParams.set('tz', tz)
        window.history.replaceState({}, '', url.toString())
      }
    } catch {
      // no-op
    }
  }, [])
  return null
}
