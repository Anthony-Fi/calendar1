"use client"

import React, { useEffect, useRef } from 'react'

export default function SwipeNav({ leftHref, rightHref }: { leftHref: string; rightHref: string }) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      handled.current = false
      const t = e.touches[0]
      startX.current = t.clientX
      startY.current = t.clientY
    }
    function onTouchMove(e: TouchEvent) {
      if (handled.current) return
      if (startX.current === null || startY.current === null) return
      const t = e.touches[0]
      const dx = t.clientX - startX.current
      const dy = t.clientY - startY.current
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      handled.current = true
      if (dx < 0) {
        // swipe left -> next
        window.location.assign(leftHref)
      } else {
        // swipe right -> prev
        window.location.assign(rightHref)
      }
    }
    function onTouchEnd() {
      startX.current = null
      startY.current = null
      handled.current = false
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [leftHref, rightHref])

  return null
}
