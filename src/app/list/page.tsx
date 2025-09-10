import prisma from '@/lib/db'
import { EventCard } from '@/components/EventCard'

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const now = new Date()
  const yParam = typeof sp?.y === 'string' ? parseInt(sp!.y, 10) : now.getUTCFullYear()
  const mParam = typeof sp?.m === 'string' ? parseInt(sp!.m, 10) : now.getUTCMonth() + 1
  const year = Number.isFinite(yParam) ? yParam : now.getUTCFullYear()
  const monthIndex0 = Number.isFinite(mParam) ? Math.min(Math.max(mParam - 1, 0), 11) : now.getUTCMonth()

  const q = typeof sp?.q === 'string' ? sp!.q : ''
  const loc = typeof sp?.loc === 'string' ? sp!.loc : ''
  const from = typeof sp?.from === 'string' ? sp!.from : ''
  const to = typeof sp?.to === 'string' ? sp!.to : ''
  const category = typeof sp?.category === 'string' ? sp!.category : ''
  const free = sp?.free === '1'
  const online = sp?.online === '1'
  const quick = typeof sp?.quick === 'string' ? sp!.quick : ''

  const page = Math.max(1, parseInt((sp?.page as string) || '1', 10))
  const pageSize = Math.min(24, Math.max(6, parseInt((sp?.pageSize as string) || '12', 10)))

  const monthStart = new Date(Date.UTC(year, monthIndex0, 1))
  const monthEnd = new Date(Date.UTC(year, monthIndex0 + 1, 0, 23, 59, 59))

  // Quick date filters (today/weekend)
  const quickDateClauses: any[] = []
  if (quick === 'today') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59))
    quickDateClauses.push({ endAt: { gte: start } }, { startAt: { lte: end } })
  } else if (quick === 'weekend') {
    const weekday = now.getUTCDay()
    const daysUntilSat = (6 - weekday + 7) % 7
    const sat = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSat, 0, 0, 0))
    const sun = new Date(Date.UTC(sat.getUTCFullYear(), sat.getUTCMonth(), sat.getUTCDate() + 1, 23, 59, 59))
    quickDateClauses.push({ endAt: { gte: sat } }, { startAt: { lte: sun } })
  }

  const where: any = {
    AND: [
      // default to current month if no explicit date filters
      { endAt: { gte: monthStart } },
      { startAt: { lte: monthEnd } },
      { deletedAt: null as any },
      q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {},
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
        ? { AND: [from ? { endAt: { gte: new Date(from) } } : {}, to ? { startAt: { lte: new Date(to) } } : {}] }
        : {},
      category ? { categories: { some: { category: { slug: category } } } } : {},
      free ? { OR: [{ priceCents: 0 }, { priceCents: null }] } : {},
      online ? { isOnline: true } : {},
      ...(quickDateClauses.length ? [{ AND: quickDateClauses }] : []),
    ],
  }

  const [itemsRaw, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { venue: true, categories: { include: { category: true } } },
      orderBy: { startAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ])
  const items = itemsRaw as any[]

  function buildUrl(overrides: Record<string, string | null | undefined>) {
    const params = new URLSearchParams()
    params.set('y', String(year))
    params.set('m', String(monthIndex0 + 1))
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (q) params.set('q', q)
    if (loc) params.set('loc', loc)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (category) params.set('category', category)
    if (sp?.free === '1') params.set('free', '1')
    if (sp?.online === '1') params.set('online', '1')
    if (quick) params.set('quick', quick)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    return `/list?${params.toString()}`
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Events</h1>
          <div className="hidden sm:flex gap-2">
            <a href={`/`} className="px-3 py-1.5 rounded border">Month</a>
            <a href={`/week`} className="px-3 py-1.5 rounded border">Week</a>
            <a href={`/day`} className="px-3 py-1.5 rounded border">Day</a>
            <a href={`/list`} className="px-3 py-1.5 rounded border bg-black text-white border-black">List</a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {items.map((ev) => (
            <EventCard
              key={ev.id}
              id={ev.id}
              title={ev.title}
              slug={ev.slug}
              startAt={ev.startAt}
              endAt={ev.endAt}
              timezone={ev.timezone}
              venue={{ name: ev.venue?.name || null, city: ev.venue?.city || null, country: ev.venue?.country || null }}
              categories={ev.categories}
              status={ev.status as any}
              coverImage={ev.coverImage}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex gap-2">
            <a aria-disabled={!hasPrev} className={`px-3 py-1.5 rounded border ${!hasPrev ? 'opacity-50 pointer-events-none' : ''}`} href={buildUrl({ page: String(page - 1) })}>Prev</a>
            <span>Page {page} / {totalPages}</span>
            <a aria-disabled={!hasNext} className={`px-3 py-1.5 rounded border ${!hasNext ? 'opacity-50 pointer-events-none' : ''}`} href={buildUrl({ page: String(page + 1) })}>Next</a>
          </div>
        </div>
      </div>
    </div>
  )
}
