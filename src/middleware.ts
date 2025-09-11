import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  if (url.pathname === '/') {
    return NextResponse.redirect(new URL('/en', req.url))
  }
  return NextResponse.next()
}

// Only run this middleware on the root path
export const config = {
  matcher: ['/'],
}
