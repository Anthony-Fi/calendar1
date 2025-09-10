import { headers } from 'next/headers'
import TzSync from '@/components/TzSync'
import SwipeNav from '@/components/SwipeNav'

export const revalidate = 60

function startOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
}
function endOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
}

export default async function DayPage({
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
  const dParam = typeof sp?.d === 'string' ? (sp.d as string) : ''
  let y: number
  let m: number
  let d: number
  if (/^\d{4}-\d{2}-\d{2}$/.test(dParam)) {
    const [ys, ms, ds] = dParam.split('-')
    y = parseInt(ys, 10)
    m = parseInt(ms, 10)
    d = parseInt(ds, 10)
  } else {
    y = parseInt((sp?.y as string) || String(now.getUTCFullYear()), 10)
    m = parseInt((sp?.m as string) || String(now.getUTCMonth() + 1), 10)
    d = parseInt((sp?.d as string) || String(now.getUTCDate()), 10)
  }

  const theDay = new Date(Date.UTC(y, Math.max(0, Math.min(11, m - 1)), Math.max(1, Math.min(31, d))))
  const dayStart = startOfUTCDate(theDay)
  const dayEnd = endOfUTCDate(theDay)

  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  const apiParams = new URLSearchParams()
  apiParams.set('from', dayStart.toISOString())
  apiParams.set('to', dayEnd.toISOString())
  if (tz) apiParams.set('tz', tz)
  const res = await fetch(`${origin}/api/events?${apiParams.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
  const data = (await res.json()) as { items: any[] }
  const events = data.items

  const title = theDay.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: tz || undefined })

  // Build prev/next day links
  function fmt(d: Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  const prevDay = new Date(Date.UTC(theDay.getUTCFullYear(), theDay.getUTCMonth(), theDay.getUTCDate() - 1))
  const nextDay = new Date(Date.UTC(theDay.getUTCFullYear(), theDay.getUTCMonth(), theDay.getUTCDate() + 1))
  const prevHref = `/${locale}/day?d=${fmt(prevDay)}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`
  const nextHref = `/${locale}/day?d=${fmt(nextDay)}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Sync browser timezone into tz query param */}
        <TzSync />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {tz && <span className="text-xs rounded border px-2 py-0.5 text-gray-700">{tz}</span>}
          </div>
          <div className="hidden sm:flex gap-2">
            <a href={`/${locale}${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('month')}</a>
            <a href={`/${locale}/week${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('week')}</a>
            <a href={`/${locale}/day${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border bg-black text-white border-black">{t('day')}</a>
            <a href={`/${locale}/list${tz ? `?tz=${encodeURIComponent(tz)}` : ''}`} className="px-3 py-1.5 rounded border">{t('list')}</a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {events.length === 0 && (
            <div className="text-sm text-gray-600">{t('noEvents')}</div>
          )}
          {events.map((ev: any) => (
            <a key={ev.id} href={`/${locale}/event/${ev.slug}`} className="border rounded p-3 hover:bg-gray-50">
              <div className="text-xs text-gray-600 mb-1">
                {new Date(ev.startAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || undefined })}
                {' - '}
                {new Date(ev.endAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || undefined })}
              </div>
              <div className="font-medium">{ev.title}</div>
              {ev.venue?.name && (
                <div className="text-xs text-gray-600">{ev.venue.name}{ev.venue.city ? `, ${ev.venue.city}` : ''}</div>
              )}
            </a>
          ))}
        </div>
        {/* Swipe navigation (mobile): right=prev day, left=next day */}
        <SwipeNav leftHref={nextHref} rightHref={prevHref} />
      </div>
    </div>
  )
}
