import { NextRequest, NextResponse } from 'next/server'

const locales = ['en', 'sv', 'fi'] as const
const defaultLocale = 'en'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Ignore API, Next internals, and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  if (!locales.includes(first as typeof locales[number])) {
    const url = req.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    return NextResponse.redirect(url)
  }
  // Protect admin routes: /[locale]/admin/*
  if (segments.length >= 2 && segments[1] === 'admin') {
    // Validate session via NextAuth session endpoint with forwarded cookies
    const sessionUrl = new URL('/api/auth/session', req.nextUrl.origin)
    const cookie = req.headers.get('cookie') || ''
    return fetch(sessionUrl.toString(), {
      headers: { cookie },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`session ${res.status}`)
        const data = await res.json().catch(() => null)
        const role = (data?.user as any)?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
        if (role === 'MODERATOR' || role === 'ADMIN') {
          return NextResponse.next()
        }
        const url = req.nextUrl.clone()
        url.pathname = `/${first}`
        return NextResponse.redirect(url)
      })
      .catch(() => {
        const url = req.nextUrl.clone()
        url.pathname = `/${first}`
        return NextResponse.redirect(url)
      }) as unknown as NextResponse
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)']
}
