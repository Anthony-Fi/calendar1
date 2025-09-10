import { headers } from 'next/headers'
import { EventCard } from '@/components/EventCard'
import TzSync from '@/components/TzSync'

export const revalidate = 60

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'sv' | 'fi' }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const messages = (await import(`@/messages/${locale}.json`)).default as any
  const t = (key: keyof typeof messages.Common) => messages.Common[key]
  const tl = (key: keyof typeof messages.List) => messages.List[key]
  const sp = await searchParams
  const tz = typeof sp?.tz === 'string' ? (sp.tz as string) : ''
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

  // Quick filters are handled by the API; we keep only month defaults for from/to below.

  // Centralized fetch from API with tz-aware filters
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const apiParams = new URLSearchParams()
  apiParams.set('page', String(page))
  apiParams.set('pageSize', String(pageSize))
  if (q) apiParams.set('q', q)
  if (loc) apiParams.set('loc', loc)
  // Default to current month if no explicit from/to provided
  const apiFrom = from || monthStart.toISOString()
  const apiTo = to || monthEnd.toISOString()
  if (apiFrom) apiParams.set('from', apiFrom)
  if (apiTo) apiParams.set('to', apiTo)
  if (category) apiParams.set('category', category)
  if (free) apiParams.set('free', '1')
  if (online) apiParams.set('online', '1')
  if (quick) apiParams.set('quick', quick)
  if (tz) apiParams.set('tz', tz)

  const res = await fetch(`${origin}/api/events?${apiParams.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
  const data = (await res.json()) as { items: any[]; page: number; pageSize: number; total: number }
  const items = data.items
  const total = data.total

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
    if (tz) params.set('tz', tz)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    return `/${locale}/list?${params.toString()}`
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Sync browser timezone into tz query param */}
        <TzSync />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{tl('events')}</h1>
            {tz && <span className="text-xs rounded border px-2 py-0.5 text-gray-700">{tz}</span>}
          </div>
          <div className="hidden sm:flex gap-2">
            <a href={`/${locale}${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('month')}</a>
            <a href={`/${locale}/week${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('week')}</a>
            <a href={`/${locale}/day${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('day')}</a>
            <a href={`/${locale}/list${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border bg-black text-white border-black">{t('list')}</a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {items.map((ev: any) => (
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
              locale={locale}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            {tl('showing')} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {tl('of')} {total}
          </div>
          <div className="flex gap-2">
            <a aria-disabled={!hasPrev} className={`px-3 py-1.5 rounded border ${!hasPrev ? 'opacity-50 pointer-events-none' : ''}`} href={buildUrl({ page: String(page - 1) })}>{t('prev')}</a>
            <span>{t('page')} {page} / {totalPages}</span>
            <a aria-disabled={!hasNext} className={`px-3 py-1.5 rounded border ${!hasNext ? 'opacity-50 pointer-events-none' : ''}`} href={buildUrl({ page: String(page + 1) })}>{t('next')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
