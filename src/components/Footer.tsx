"use client"

import { useSession, signOut } from 'next-auth/react'

type Props = {
  locale: 'en' | 'sv' | 'fi'
}

export default function Footer({ locale }: Props) {
  const { data } = useSession()
  const user = (data as any)?.user
  const role = (user as any)?.role
  return (
    <footer className="mt-10 border-t py-6 text-sm text-gray-700">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <a href={`/${locale}/contact`} className="underline">Contact</a>
          <span className="text-gray-300">|</span>
          <a href={`/${locale}/rules`} className="underline">Rules</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-gray-600">{user.email}</span>
              {role && <span className="rounded border px-2 py-0.5 text-gray-700">{String(role)}</span>}
              <a href={`/${locale}/events/new`} className="underline">Create event</a>
              <a href={`/${locale}/me/events`} className="underline">My events</a>
              {(role === 'MODERATOR' || role === 'ADMIN') && (
                <a href={`/${locale}/admin/events`} className="underline">Admin</a>
              )}
              <button className="underline" type="button" onClick={() => signOut({ callbackUrl: `/${locale}` })}>Sign out</button>
            </>
          ) : (
            <a href={`/${locale}/login`} className="underline">Login</a>
          )}
        </div>
      </div>
    </footer>
  )
}
