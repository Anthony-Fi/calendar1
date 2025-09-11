import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { pickEventTranslation } from '@/lib/i18n-events'

// Events API: tries Prisma; if DB unavailable, falls back to mock data.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const from = searchParams.get('from') // ISO date
  const to = searchParams.get('to') // ISO date
  const category = searchParams.get('category')
  const loc = searchParams.get('loc') ?? ''
  const free = searchParams.get('free') === '1'
  const online = searchParams.get('online') === '1'
  const quick = searchParams.get('quick') // 'today' | 'weekend'
  const tz = searchParams.get('tz') || ''
  const locale = (searchParams.get('locale') as 'sv' | 'fi' | 'en' | null) || null
  const status = searchParams.get('status') as
    | 'DRAFT'
    | 'SCHEDULED'
    | 'LIVE'
    | 'CANCELLED'
    | 'SOLD_OUT'
    | null
  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '20'), 100)

  // Build where clause (avoid tight Prisma typing for compatibility)
  // Date quick filters; if tz is provided, compute day boundaries in that timezone; otherwise use server local time.
  const quickDateClauses: any[] = []
  function zonedDateToUtc(y: number, m1: number, d: number, h: number, mi: number, s: number, ms: number, zone: string) {
    const utc = new Date(Date.UTC(y, m1 - 1, d, h, mi, s, ms))
    const asInZone = new Date(utc.toLocaleString('en-US', { timeZone: zone }))
    const diff = utc.getTime() - asInZone.getTime()
    return new Date(utc.getTime() + diff)
  }
  function getYmdInZone(base: Date, zone: string) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const [y, m, d] = f.format(base).split('-').map((v) => parseInt(v, 10))
    return { y, m, d }
  }
  function addDays(y: number, m: number, d: number, days: number) {
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() + days)
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
  }
  if (quick) {
    if (tz) {
      const now = new Date()
      const { y, m, d } = getYmdInZone(now, tz)
      // Compute weekday in zone (0=Sun..6=Sat)
      const wdStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now)
      const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
      const weekday = map[wdStr] ?? 0
      if (quick === 'today') {
        const start = zonedDateToUtc(y, m, d, 0, 0, 0, 0, tz)
        const end = zonedDateToUtc(y, m, d, 23, 59, 59, 999, tz)
        quickDateClauses.push({ endAt: { gte: start } }, { startAt: { lte: end } })
      } else if (quick === 'weekend') {
        const daysUntilFri = (5 - weekday + 7) % 7
        const friYmd = addDays(y, m, d, daysUntilFri)
        const sunYmd = addDays(friYmd.y, friYmd.m, friYmd.d, 2)
        const start = zonedDateToUtc(friYmd.y, friYmd.m, friYmd.d, 0, 0, 0, 0, tz)
        const end = zonedDateToUtc(sunYmd.y, sunYmd.m, sunYmd.d, 23, 59, 59, 999, tz)
        quickDateClauses.push({ endAt: { gte: start } }, { startAt: { lte: end } })
      }
    } else {
      // Fallback: server local time
      const now = new Date()
      if (quick === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        quickDateClauses.push({ endAt: { gte: start } }, { startAt: { lte: end } })
      } else if (quick === 'weekend') {
        const weekday = now.getDay()
        const daysUntilFri = (5 - weekday + 7) % 7
        const fri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFri, 0, 0, 0, 0)
        const sun = new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 2, 23, 59, 59, 999)
        quickDateClauses.push({ endAt: { gte: fri } }, { startAt: { lte: sun } })
      }
    }
  }

  const where: any = {
    AND: [
      { deletedAt: null },
      q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      loc
        ? {
            OR: [
              { venue: { name: { contains: loc, mode: 'insensitive' } } },
              { venue: { city: { contains: loc, mode: 'insensitive' } } },
              { venue: { country: { contains: loc, mode: 'insensitive' } } },
            ],
          }
        : {},
      from || to
        ? {
            // overlap between [startAt, endAt] and [from, to]
            AND: [
              from ? { endAt: { gte: new Date(from) } } : {},
              to ? { startAt: { lte: new Date(to) } } : {},
            ],
          }
        : {},
      category
        ? {
            categories: { some: { category: { slug: category } } },
          }
        : {},
      status ? { status } : { NOT: { status: 'DRAFT' } },
      free ? { OR: [{ priceCents: 0 }, { priceCents: null }] } : {},
      online ? { isOnline: true } : {},
      ...(quickDateClauses.length ? [{ AND: quickDateClauses }] : []),
    ],
  }

  try {
    // First, try including translations (new schema)
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          venue: true,
          categories: { include: { category: true } },
          organizer: true,
          translations: true,
        } as any,
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ])

    const localized = items.map((e: any) => {
      const t = pickEventTranslation(
        { title: e.title, description: e.description, translations: (e as any).translations || [] },
        locale
      )
      return { ...e, title: t.title ?? e.title, description: t.description ?? e.description }
    })

    return NextResponse.json({ items: localized, page, pageSize, total })
  } catch (err) {
    // Retry without translations for backward compatibility
    try {
      const [items, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            venue: true,
            categories: { include: { category: true } },
            organizer: true,
          },
          orderBy: { startAt: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.event.count({ where }),
      ])
      return NextResponse.json({ items, page, pageSize, total })
    } catch (e2) {
    // Fallback: mock data if DB is not reachable or tables not migrated yet
    const all = [
      {
        id: 'evt_mock_1',
        title: 'Sample Event',
        slug: 'sample-event',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        timezone: 'UTC',
        status: 'SCHEDULED',
        isFeatured: true,
        venue: { name: 'Main Hall' },
        categories: [{ category: { name: 'General', slug: 'general' } }],
      },
    ]

    const filtered = all.filter((e) => {
      const matchQ = q ? e.title.toLowerCase().includes(q.toLowerCase()) : true
      const matchCat = category
        ? e.categories.some((c) => c.category.slug === category)
        : true
      const matchStatus = status ? (e.status as string) === status : true
      const start = from ? new Date(from).getTime() : undefined
      const end = to ? new Date(to).getTime() : undefined
      const evStart = new Date(e.startAt).getTime()
      const evEnd = new Date(e.endAt).getTime()
      const matchFrom = start ? evEnd >= start : true
      const matchTo = end ? evStart <= end : true
      return matchQ && matchCat && matchStatus && matchFrom && matchTo
    })

    const startIndex = (page - 1) * pageSize
    const items = filtered.slice(startIndex, startIndex + pageSize)
    return NextResponse.json({ items, page, pageSize, total: filtered.length })
    }
  }
}
