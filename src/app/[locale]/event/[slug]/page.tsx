import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import TzSync from '@/components/TzSync'

function formatRange(start: Date, end: Date, tz = 'UTC', locale: string = 'en-GB') {
  const startStr = new Date(start).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: tz,
  })
  const endStr = new Date(end).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: tz,
  })
  return `${startStr} → ${endStr}`
}

export default async function EventPage({ params, searchParams }: { params: Promise<{ locale: 'en' | 'sv' | 'fi'; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, slug } = await params
  const sp = await searchParams
  const tzParam = typeof sp?.tz === 'string' ? (sp.tz as string) : ''
  const messages = (await import(`@/messages/${locale}.json`)).default as any
  const t = (key: keyof typeof messages.Event) => messages.Event[key]

  const event = (await prisma.event.findFirst({
    where: ({ slug, deletedAt: null as any } as any),
    include: {
      venue: true,
      organizer: true,
      categories: { include: { category: true } },
    },
  })) as any

  if (!event) return notFound()
  if ((event as any).status === 'DRAFT') return notFound()

  const tz = tzParam || event.timezone || 'UTC'

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Sync browser timezone into tz query param */}
        <TzSync />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            {tz && <span className="text-xs rounded border px-2 py-0.5 text-gray-700">{tz}</span>}
          </div>
          <span
            className={[
              'text-xs px-2 py-1 rounded border',
              event.status === 'LIVE'
                ? 'border-green-500 text-green-700'
                : event.status === 'CANCELLED'
                ? 'border-red-500 text-red-600'
                : event.status === 'SOLD_OUT'
                ? 'border-yellow-500 text-yellow-700'
                : 'border-gray-300 text-gray-600',
            ].join(' ')}
          >
            {event.status}
          </span>
        </div>

        <div className="text-sm text-gray-600">
          <div>{formatRange(event.startAt, event.endAt, tz, locale)} ({tz})</div>
          {event.venue && (
            <div>
              <span className="font-medium">{t('venue')}:</span> {event.venue.name}
              {event.venue.city ? `, ${event.venue.city}` : ''}
              {event.venue.country ? `, ${event.venue.country}` : ''}
            </div>
          )}
          {event.organizer && (
            <div>
              <span className="font-medium">{t('organizer')}:</span> {event.organizer.name}
            </div>
          )}
        </div>

        {!!event.categories?.length && (
          <div className="flex flex-wrap gap-2">
            {event.categories.map((c: any) => (
              <span
                key={c.categoryId}
                className="text-xs rounded-full border px-2 py-1 text-gray-700"
                style={{ borderColor: c.category.color || '#e5e7eb' }}
                title={c.category.slug}
              >
                {c.category.name}
              </span>
            ))}
          </div>
        )}

        {event.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={event.title}
            className="w-full rounded border"
          />
        )}

        {event.description && (
          <div className="prose dark:prose-invert max-w-none">
            <p>{event.description}</p>
          </div>
        )}

        <div>
          <a href={`/${locale}${tzParam ? `?tz=${encodeURIComponent(tzParam)}` : ''}`} className="text-sm underline text-blue-600">{t('back')}</a>
        </div>
      </div>
    </div>
  )
}
