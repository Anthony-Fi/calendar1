import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

async function verifyTurnstile(token: string | undefined, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // If no secret configured, skip verification (treat as dev mode)
    return { success: true }
  }
  if (!token) return { success: false, error: 'missing-token' }
  try {
    const form = new URLSearchParams()
    form.set('secret', secret)
    form.set('response', token)
    if (ip) form.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const data = (await res.json()) as { success: boolean; [k: string]: any }
    return data
  } catch (e) {
    return { success: false, error: 'verify-failed' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, group, location, email, consent, token } = (await req.json()) as {
      name?: string
      group?: string
      location?: string
      email?: string
      consent?: boolean
      token?: string
    }
    if (!name || !email) {
      return new NextResponse('Missing required fields', { status: 400 })
    }
    if (!consent) {
      return new NextResponse('Consent is required', { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
    const ua = req.headers.get('user-agent') || undefined

    const verify = await verifyTurnstile(token, ip)
    if (!verify?.success) {
      return new NextResponse('CAPTCHA verification failed', { status: 400 })
    }

    await prisma.accessRequest.create({
      data: {
        name,
        group: group || null,
        location: location || null,
        email,
        consent: !!consent,
        ip: ip || null,
        userAgent: ua || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return new NextResponse('Error creating request', { status: 500 })
  }
}
