import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/db'

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  const needsQuotes = /[",\n]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const roleFilter = searchParams.get('role') ?? ''
  const verified = searchParams.get('verified') === '1'
  const optinOnly = searchParams.get('optin') === '1'

  const where: any = {
    AND: [
      q
        ? ({ OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ] } as any)
        : ({} as any),
      roleFilter ? ({ role: roleFilter } as any) : ({} as any),
      verified ? ({ emailVerified: { not: null } } as any) : ({} as any),
      optinOnly ? ({ marketingOptIn: true } as any) : ({} as any),
    ],
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      marketingOptIn: true,
      marketingOptInAt: true,
      createdAt: true,
    },
  })

  const header = ['name','email','role','verified','optin','optinAt','createdAt']
  const rows = users.map((u) => [
    toCsvValue(u.name ?? ''),
    toCsvValue(u.email ?? ''),
    toCsvValue(u.role),
    toCsvValue(u.emailVerified ? 'yes' : 'no'),
    toCsvValue(u.marketingOptIn ? 'yes' : 'no'),
    toCsvValue(u.marketingOptInAt ? new Date(u.marketingOptInAt).toISOString() : ''),
    toCsvValue(u.createdAt ? new Date(u.createdAt).toISOString() : ''),
  ].join(','))

  const csv = [header.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users-export.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
