import prisma from '@/lib/db'
import { getMonthGrid } from '@/lib/calendar/month'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TzSync from '@/components/TzSync'

// Minimal local type for rendering; avoids importing Prisma model types
type EventWithRelations = {
  id: string
  title: string
  slug: string
  startAt: Date
  endAt: Date
  categories: { category: { name: string; slug: string } }[]
  coverImage?: string | null
  venue: { name?: string | null; city?: string | null; country?: string | null } | null
  timezone?: string | null
}

function formatMonthYear(d: Date, locale: string) {
  return d.toLocaleString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'sv' | 'fi' }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const messages = (await import(`@/messages/${locale}.json`)).default as any
  const t = (key: keyof typeof messages.Common) => messages.Common[key]
  const th = (key: keyof typeof messages.Home) => messages.Home[key]
  const sp = await searchParams

  const now = new Date()
  const yParam = typeof sp?.y === 'string' ? parseInt(sp!.y, 10) : now.getUTCFullYear()
  const mParam = typeof sp?.m === 'string' ? parseInt(sp!.m, 10) : now.getUTCMonth() + 1 // 1-12
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
  const tz = typeof sp?.tz === 'string' ? sp!.tz : ''

  // Calculate the grid range (start and end dates shown in the month grid)
  const grid = getMonthGrid(year, monthIndex0, 1) // Monday start
  const gridStart = grid[0][0].date
  const gridEnd = grid[5][6].date

  // Quick date filters (today/weekend) respecting tz if provided; weekend = Fri-Sun
  let quickStart: Date | null = null
  let quickEnd: Date | null = null
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
      const { y, m, d } = getYmdInZone(now, tz)
      // weekday in tz
      const wdStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now)
      const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
      const weekday = map[wdStr] ?? 0
      if (quick === 'today') {
        quickStart = zonedDateToUtc(y, m, d, 0, 0, 0, 0, tz)
        quickEnd = zonedDateToUtc(y, m, d, 23, 59, 59, 999, tz)
      } else if (quick === 'weekend') {
        const daysUntilFri = (5 - weekday + 7) % 7
        const friYmd = addDays(y, m, d, daysUntilFri)
        const sunYmd = addDays(friYmd.y, friYmd.m, friYmd.d, 2)
        quickStart = zonedDateToUtc(friYmd.y, friYmd.m, friYmd.d, 0, 0, 0, 0, tz)
        quickEnd = zonedDateToUtc(sunYmd.y, sunYmd.m, sunYmd.d, 23, 59, 59, 999, tz)
      }
    } else {
      if (quick === 'today') {
        quickStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        quickEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      } else if (quick === 'weekend') {
        const weekday = now.getDay()
        const daysUntilFri = (5 - weekday + 7) % 7
        const fri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFri, 0, 0, 0, 0)
        const sun = new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 2, 23, 59, 59, 999)
        quickStart = fri
        quickEnd = sun
      }
    }
  }

  // Build filters
  const where: any = {
    AND: [
      // Overlap month grid
      { endAt: { gte: gridStart } },
      { startAt: { lte: gridEnd } },
      // Exclude soft-deleted
      { deletedAt: null as any },
      // Exclude drafts from public month view
      { NOT: { status: 'DRAFT' as any } },
      // Keyword
      q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      // Location (venue name/city/country)
      loc
        ? {
            OR: [
              { venue: { name: { contains: loc, mode: 'insensitive' } } },
              { venue: { city: { contains: loc, mode: 'insensitive' } } },
              { venue: { country: { contains: loc, mode: 'insensitive' } } },
            ],
          }
        : {},
      // Explicit date range (optional)
      from || to
        ? {
            AND: [
              from ? { endAt: { gte: new Date(from) } } : {},
              to ? { startAt: { lte: new Date(to) } } : {},
            ],
          }
        : {},
      // Quick range (today/weekend)
      quickStart && quickEnd
        ? {
            AND: [
              { endAt: { gte: quickStart } },
              { startAt: { lte: quickEnd } },
            ],
          }
        : {},
      category ? { categories: { some: { category: { slug: category } } } } : {},
      free ? { OR: [{ priceCents: 0 }, { priceCents: null }] } : {},
      online ? { isOnline: true } : {},
    ],
  }

  // Fetch events
  const events = (await prisma.event.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: {
      categories: { include: { category: true } },
      venue: true,
    },
  })) as unknown as EventWithRelations[]

  // Featured events for strip
  const featured = (await prisma.event.findMany({
    where: ({
      AND: [
        { deletedAt: null as any },
        { isFeatured: true },
        { endAt: { gte: gridStart } },
        { startAt: { lte: gridEnd } },
      ],
    } as any),
    orderBy: { startAt: 'asc' },
    include: {
      categories: { include: { category: true } },
      venue: true,
    },
    take: 6,
  })) as unknown as EventWithRelations[]

  // Map events by YYYY-MM-DD for quick lookup
  const eventsByDay = new Map<string, typeof events>()
  for (const ev of events) {
    const d = new Date(ev.startAt)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    if (!eventsByDay.has(key)) eventsByDay.set(key, [])
    eventsByDay.get(key)!.push(ev)
  }

  // Build navigation URLs preserving current filters
  function buildUrl(nextYear: number, nextMonthIndex0: number) {
    return buildUrlWith({ y: String(nextYear), m: String(nextMonthIndex0 + 1) })
  }

  function buildUrlWith(overrides: Record<string, string | null | undefined>) {
    const params = new URLSearchParams()
    params.set('y', String(year))
    params.set('m', String(monthIndex0 + 1))
    if (q) params.set('q', q)
    if (loc) params.set('loc', loc)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (category) params.set('category', category)
    if (free) params.set('free', '1')
    if (online) params.set('online', '1')
    if (quick) params.set('quick', quick)
    if (tz) params.set('tz', tz)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    return `/${locale}?${params.toString()}`
  }

  

  function buildLocaleUrl(nextLocale: 'en' | 'sv' | 'fi') {
    const params = new URLSearchParams()
    params.set('y', String(year))
    params.set('m', String(monthIndex0 + 1))
    if (q) params.set('q', q)
    if (loc) params.set('loc', loc)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (category) params.set('category', category)
    if (free) params.set('free', '1')
    if (online) params.set('online', '1')
    if (quick) params.set('quick', quick)
    return `/${nextLocale}?${params.toString()}`
  }

  const prevMonthDate = new Date(Date.UTC(year, monthIndex0 - 1, 1))
  const nextMonthDate = new Date(Date.UTC(year, monthIndex0 + 1, 1))

  // Locale weekday headers starting Monday
  const weekdayHeaders = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.UTC(2021, 0, 4 + i)) // Mon Jan 4, 2021 is a Monday
    return d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
  })

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Sync browser timezone into tz query param */}
        <TzSync />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{formatMonthYear(new Date(Date.UTC(year, monthIndex0, 1)), locale)}</h1>
            {tz && <span className="text-xs rounded border px-2 py-0.5 text-gray-700">{tz}</span>}
          </div>
          <div className="flex gap-2 items-center">
            <a href={buildUrl(now.getUTCFullYear(), now.getUTCMonth())} className="px-3 py-1.5 rounded border">{t('today')}</a>
            <a href={buildUrl(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth())} className="px-3 py-1.5 rounded border">{t('prev')}</a>
            <a href={buildUrl(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth())} className="px-3 py-1.5 rounded border">{t('next')}</a>
            <div className="hidden sm:flex gap-2">
              <a href={buildUrlWith({})} className="px-3 py-1.5 rounded border">{t('month')}</a>
              <a href={`/${locale}/week${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('week')}</a>
              <a href={`/${locale}/day${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('day')}</a>
              <a href={`/${locale}/list`} className="px-3 py-1.5 rounded border">{t('list')}</a>
            </div>
            <div className="hidden sm:flex gap-1 text-xs ml-2">
              <a href={buildLocaleUrl('en')} className={`px-2 py-1 rounded border ${locale==='en' ? 'bg-black text-white border-black' : ''}`}>EN</a>
              <a href={buildLocaleUrl('sv')} className={`px-2 py-1 rounded border ${locale==='sv' ? 'bg-black text-white border-black' : ''}`}>SV</a>
              <a href={buildLocaleUrl('fi')} className={`px-2 py-1 rounded border ${locale==='fi' ? 'bg-black text-white border-black' : ''}`}>FI</a>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form className="mb-6 grid grid-cols-1 sm:grid-cols-6 gap-2" method="get" action={`/${locale}`}>
          <input type="hidden" name="y" value={String(year)} />
          <input type="hidden" name="m" value={String(monthIndex0 + 1)} />
          <Input name="q" defaultValue={q} placeholder={th('searchPlaceholder')} className="sm:col-span-3" />
          <Input name="loc" defaultValue={loc} placeholder={th('locationPlaceholder')} className="sm:col-span-1" />
          <Input type="date" name="from" defaultValue={from} className="sm:col-span-1" />
          <div className="sm:col-span-1 flex gap-2">
            <Input type="date" name="to" defaultValue={to} className="flex-1" />
            <Button type="submit" className="hidden sm:inline-flex">Search</Button>
          </div>
        </form>

        {/* Quick filter chips */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <a href={buildUrlWith({ category: '' })} className={`px-3 py-1.5 rounded border ${!category ? 'bg-black text-white border-black' : ''}`}>{th('all')}</a>
          <a href={buildUrlWith({ category: 'music' })} className={`px-3 py-1.5 rounded border ${category==='music' ? 'bg-black text-white border-black' : ''}`}>{th('music')}</a>
          <a href={buildUrlWith({ free: free ? '' : '1' })} className={`px-3 py-1.5 rounded border ${free ? 'bg-black text-white border-black' : ''}`}>{th('free')}</a>
          <a href={buildUrlWith({ online: online ? '' : '1' })} className={`px-3 py-1.5 rounded border ${online ? 'bg-black text-white border-black' : ''}`}>{th('online')}</a>
          {(() => {
            // Build Today link; when enabling, jump to today's month (LOCAL)
            const todayYear = now.getFullYear()
            const todayMonthIndex0 = now.getMonth()
            const enableToday = buildUrlWith({ quick: 'today', y: String(todayYear), m: String(todayMonthIndex0 + 1) })
            const disableToday = buildUrlWith({ quick: '' })
            const todayHref = quick === 'today' ? disableToday : enableToday
            return (
              <a href={todayHref} className={`px-3 py-1.5 rounded border ${quick==='today' ? 'bg-black text-white border-black' : ''}`}>{th('quickToday')}</a>
            )
          })()}
          {(() => {
            // Build This weekend link; when enabling, go to Week view starting from upcoming Friday in tz/local
            let friDate: Date
            if (tz) {
              const { y, m, d } = getYmdInZone(now, tz)
              const wdStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now)
              const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
              const weekday = map[wdStr] ?? 0
              const daysUntilFri = (5 - weekday + 7) % 7
              const friYmd = addDays(y, m, d, daysUntilFri)
              friDate = new Date(Date.UTC(friYmd.y, friYmd.m - 1, friYmd.d))
            } else {
              const weekday = now.getDay()
              const daysUntilFri = (5 - weekday + 7) % 7
              friDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFri)
            }
            const yyyymmdd = `${friDate.getUTCFullYear()}-${String(friDate.getUTCMonth() + 1).padStart(2, '0')}-${String(friDate.getUTCDate()).padStart(2, '0')}`
            const params = new URLSearchParams()
            params.set('d', yyyymmdd)
            if (tz) params.set('tz', tz)
            const wkHref = `/${locale}/week?${params.toString()}`
            return (
              <a href={wkHref} className={`px-3 py-1.5 rounded border ${quick==='weekend' ? 'bg-black text-white border-black' : ''}`}>{th('quickWeekend')}</a>
            )
          })()}
          {tz && <span className="ml-1 text-xs rounded border px-2 py-0.5 text-gray-700">{tz}</span>}
        </div>

        {/* Featured strip */}
        {featured.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{th('featuredThisMonth')}</h2>
              <a href={buildUrl(year, monthIndex0)} className="text-sm underline">{t('viewAll')}</a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map((ev) => (
                <div key={ev.id} className="min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={`/${locale}/event/${ev.slug}`} className="block rounded-lg overflow-hidden border hover:shadow-sm transition-shadow bg-white">
                    <img src={ev.coverImage || `https://picsum.photos/seed/${encodeURIComponent(ev.slug)}/600/320`} alt={ev.title} className="w-full h-36 object-cover" />
                    <div className="p-3 space-y-1">
                      <div className="text-xs text-gray-600">{new Date(ev.startAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: ev.timezone || 'UTC' })}</div>
                      <div className="text-sm font-semibold truncate">{ev.title}</div>
                      {ev.venue?.name && (<div className="text-xs text-gray-600 truncate">{ev.venue.name}{ev.venue.city ? `, ${ev.venue.city}` : ''}</div>)}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2">
          {weekdayHeaders.map((d, i) => (
            <div key={i} className="text-xs font-medium text-gray-500">{d}</div>
          ))}
          {grid.flat().map((cell, idx) => {
            const key = `${cell.date.getUTCFullYear()}-${String(cell.date.getUTCMonth() + 1).padStart(2, '0')}-${String(cell.date.getUTCDate()).padStart(2, '0')}`
            const items = eventsByDay.get(key) ?? []
            return (
              <div key={idx} className={['border rounded p-2 min-h-[90px] flex flex-col gap-1', cell.inCurrentMonth ? '' : 'opacity-50', cell.isToday ? 'border-blue-500' : ''].join(' ')}>
                <a href={`/${locale}/day?d=${key}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`} className="text-xs font-medium underline">{cell.date.getUTCDate()}</a>
                <div className="flex flex-col gap-1">
                  {/* Mobile: show a compact count badge that links to Day view */}
                  <div className="sm:hidden">
                    {items.length > 0 && (
                      <a href={`/${locale}/day?d=${key}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`} className="inline-block text-xs rounded bg-gray-100 px-1.5 py-0.5 hover:bg-gray-200">
                        {items.length} {items.length === 1 ? 'event' : 'events'}
                      </a>
                    )}
                  </div>
                  {/* Desktop/tablet: show individual event titles */}
                  <div className="hidden sm:flex flex-col gap-1">
                    {items.slice(0,3).map((ev: EventWithRelations) => (
                      <a key={ev.id} href={`/${locale}/event/${ev.slug}`} className="text-xs truncate rounded bg-gray-100 px-1 py-0.5 hover:bg-gray-200">{ev.title}</a>
                    ))}
                    {items.length > 3 && (
                      <a href={`/${locale}/day?d=${key}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`} className="text-[10px] text-gray-500 underline">+{items.length - 3} more</a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
