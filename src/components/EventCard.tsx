import Link from 'next/link'

export type EventCardProps = {
  id: string
  title: string
  slug: string
  startAt: Date
  endAt: Date
  timezone?: string | null
  venue?: { name?: string | null; city?: string | null; country?: string | null } | null
  categories?: { category: { name: string; slug: string; color?: string | null } }[]
  status?: 'SCHEDULED' | 'LIVE' | 'CANCELLED' | 'SOLD_OUT'
  coverImage?: string | null
  locale?: string
}

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

export function EventCard({
  id,
  title,
  slug,
  startAt,
  endAt,
  timezone,
  venue,
  categories,
  status,
  coverImage,
  locale = 'en',
}: EventCardProps) {
  const tz = timezone || 'UTC'
  return (
    <div className="rounded-lg overflow-hidden border hover:shadow-sm transition-shadow bg-white">
      <Link href={`/${locale}/event/${slug}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage || `https://picsum.photos/seed/${encodeURIComponent(slug)}/600/320`}
          alt={title}
          className="w-full h-40 object-cover"
        />
      </Link>
      <div className="p-3 space-y-2">
        <div className="text-xs text-gray-600">{formatRange(startAt, endAt, tz, locale)}</div>
        <Link href={`/${locale}/event/${slug}`} className="block text-sm font-semibold hover:underline">
          {title}
        </Link>
        {venue?.name && (
          <div className="text-xs text-gray-600">
            {venue.name}
            {venue.city ? `, ${venue.city}` : ''}
            {venue.country ? `, ${venue.country}` : ''}
          </div>
        )}
        {(categories?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories!.slice(0, 3).map((c) => (
              <span
                key={`${id}-${c.category.slug}`}
                className="text-[10px] rounded-full border px-1.5 py-0.5 text-gray-700"
                style={{ borderColor: c.category.color || '#e5e7eb' }}
                title={c.category.slug}
              >
                {c.category.name}
              </span>
            ))}
            {categories!.length! > 3 && (
              <span className="text-[10px] text-gray-500">+{categories!.length! - 3} more</span>
            )}
          </div>
        )}
        {status && (
          <div className="text-[10px]">
            <span
              className={[
                'px-1.5 py-0.5 rounded border',
                status === 'LIVE'
                  ? 'border-green-500 text-green-700'
                  : status === 'CANCELLED'
                  ? 'border-red-500 text-red-600'
                  : status === 'SOLD_OUT'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-gray-300 text-gray-600',
              ].join(' ')}
            >
              {status}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
