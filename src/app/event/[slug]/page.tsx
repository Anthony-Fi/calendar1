import prisma from '@/lib/db'
import { notFound } from 'next/navigation'

function formatRange(start: Date, end: Date, tz = 'UTC') {
  const startStr = new Date(start).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: tz,
  })
  const endStr = new Date(end).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: tz,
  })
  return `${startStr} → ${endStr}`
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      venue: true,
      organizer: true,
      categories: { include: { category: true } },
    },
  })

  if (!event) return notFound()

  const tz = event.timezone || 'UTC'

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{event.title}</h1>
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
          <div>{formatRange(event.startAt, event.endAt, tz)} ({tz})</div>
          {event.venue && (
            <div>
              <span className="font-medium">Venue:</span> {event.venue.name}
              {event.venue.city ? `, ${event.venue.city}` : ''}
              {event.venue.country ? `, ${event.venue.country}` : ''}
            </div>
          )}
          {event.organizer && (
            <div>
              <span className="font-medium">Organizer:</span> {event.organizer.name}
            </div>
          )}
        </div>

        {!!event.categories?.length && (
          <div className="flex flex-wrap gap-2">
            {event.categories.map((c) => (
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
          <a href="/" className="text-sm underline text-blue-600">← Back to calendar</a>
        </div>
      </div>
    </div>
  )
}
