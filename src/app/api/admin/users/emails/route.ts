import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/db'

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
    select: { email: true },
  })

  const set = new Set<string>()
  for (const u of users) {
    const e = (u.email || '').trim()
    if (e) set.add(e.toLowerCase())
  }
  const emails = Array.from(set.values()).sort((a, b) => a.localeCompare(b))

  return NextResponse.json({ emails })
}
