import { headers } from 'next/headers'
import TzSync from '@/components/TzSync'

function startOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
}
function endOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
}

export default async function WeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'sv' | 'fi' }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const messages = (await import(`@/messages/${locale}.json`)).default as any
  const t = (key: keyof typeof messages.Common) => messages.Common[key]
  const sp = await searchParams
  const tz = typeof sp?.tz === 'string' ? (sp.tz as string) : ''
  const now = new Date()
  const base = sp?.d ? new Date(sp.d as string) : now

  // Compute Monday..Sunday range in UTC
  const weekday = (base.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  const monday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - weekday))
  const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6))
  const weekStart = startOfUTCDate(monday)
  const weekEnd = endOfUTCDate(sunday)

  // Centralized fetch from API
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const apiParams = new URLSearchParams()
  apiParams.set('from', weekStart.toISOString())
  apiParams.set('to', weekEnd.toISOString())
  if (tz) apiParams.set('tz', tz)
  const res = await fetch(`${origin}/api/events?${apiParams.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
  const data = (await res.json()) as { items: any[] }
  const events = data.items

  const days: { date: Date; items: typeof events }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i))
    days.push({ date: d, items: [] })
  }
  const map = new Map<string, { date: Date; items: typeof events }>(
    days.map((x) => [
      `${x.date.getUTCFullYear()}-${String(x.date.getUTCMonth() + 1).padStart(2, '0')}-${String(x.date.getUTCDate()).padStart(2, '0')}`,
      x,
    ])
  )
  for (const ev of events) {
    const d = new Date(ev.startAt)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    const bucket = map.get(key)
    if (bucket) bucket.items.push(ev)
  }

  const title = `Week of ${monday.toLocaleDateString(locale, { dateStyle: 'medium' })}`

  function buildDayLink(d: Date) {
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    const dd = d.getUTCDate()
    const params = new URLSearchParams()
    params.set('y', String(y))
    params.set('m', String(m))
    params.set('d', String(dd))
    if (tz) params.set('tz', tz)
    return `/${locale}/day?${params.toString()}`
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Sync browser timezone into tz query param */}
        <TzSync />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {tz && <span className="text-xs rounded border px-2 py-0.5 text-gray-700">{tz}</span>}
          </div>
          <div className="hidden sm:flex gap-2">
            <a href={`/${locale}${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('month')}</a>
            <a href={`/${locale}/week${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border bg-black text-white border-black">{t('week')}</a>
            <a href={`/${locale}/day${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('day')}</a>
            <a href={`/${locale}/list${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('list')}</a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((col, idx) => (
            <div key={idx} className="border rounded p-3 space-y-2 min-h-[140px]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{col.date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                <a href={buildDayLink(col.date)} className="text-xs underline">{t('day')}</a>
              </div>
              <div className="flex flex-col gap-2">
                {col.items.length === 0 && (
                  <div className="text-xs text-gray-500">{t('noEvents')}</div>
                )}
                {col.items.map((ev: any) => (
                  <a key={ev.id} href={`/${locale}/event/${ev.slug}`} className="text-xs truncate rounded bg-gray-100 px-1 py-0.5 hover:bg-gray-200">
                    {new Date(ev.startAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || undefined })} · {ev.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
