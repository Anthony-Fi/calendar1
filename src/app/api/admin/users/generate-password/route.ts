import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/db'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

function generatePassword(): string {
  // ~18 chars, URL-safe, mixed charset
  const raw = crypto.randomBytes(14).toString('base64url') // ~19 chars
  // Ensure complexity by appending a mix if needed
  const extras = '!Aa1#'
  return (raw + extras).slice(0, 18)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 })

  const body = (await req.json().catch(() => ({}))) as { uid?: string }
  const uid = body?.uid || new URL(req.url).searchParams.get('uid') || ''
  if (!uid) return new NextResponse('Missing uid', { status: 400 })

  const pwd = generatePassword()
  const pwdHash = await hash(pwd, 12)

  await prisma.user.update({ where: { id: uid }, data: { passwordHash: pwdHash } })
  // Log audit without storing plaintext
  await (prisma as any).userAudit.create({
    data: {
      userId: uid,
      adminId: (session as any)?.user?.id || null,
      action: 'set_password',
      fromValue: null,
      toValue: 'updated',
    },
  })

  return NextResponse.json({ password: pwd })
}
