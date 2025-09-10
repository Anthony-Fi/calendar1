"use client"

import React from 'react'

export default function MobileNav({ locale }: { locale: 'en' | 'sv' | 'fi' }) {
  const items = [
    { href: `/${locale}`, label: 'Month' },
    { href: `/${locale}/week`, label: 'Week' },
    { href: `/${locale}/day`, label: 'Day' },
    { href: `/${locale}/list`, label: 'List' },
  ]

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-4">
        {items.map((it) => (
          <li key={it.href} className="text-center">
            <a href={it.href} className="block py-3 text-sm font-medium hover:bg-gray-50 active:bg-gray-100">
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
