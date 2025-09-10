"use client"

import React from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: any) => void
      remove: (widget: HTMLElement) => void
    }
  }
}

export default function TurnstileWidget({ siteKey, onToken, className = '' }: { siteKey: string; onToken: (token: string) => void; className?: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!siteKey) return
    const ensureScript = () => {
      if (document.querySelector('script[data-turnstile]')) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const s = document.createElement('script')
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        s.async = true
        s.defer = true
        s.setAttribute('data-turnstile', '1')
        s.onload = () => resolve()
        document.head.appendChild(s)
      })
    }

    let removed = false
    ensureScript().then(() => {
      if (removed) return
      if (window.turnstile && ref.current) {
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => onToken(token),
        })
      }
    })

    return () => {
      removed = true
      // no-op; turnstile auto-cleans when element is removed
    }
  }, [siteKey, onToken])

  if (!siteKey) return null

  return <div ref={ref} className={className} />
}
