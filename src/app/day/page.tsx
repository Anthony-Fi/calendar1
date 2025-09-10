import prisma from '@/lib/db'

function startOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
}
function endOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
}

export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const now = new Date()
  const y = parseInt((sp?.y as string) || String(now.getUTCFullYear()), 10)
  const m = parseInt((sp?.m as string) || String(now.getUTCMonth() + 1), 10)
  const d = parseInt((sp?.d as string) || String(now.getUTCDate()), 10)

  const theDay = new Date(Date.UTC(y, Math.max(0, Math.min(11, m - 1)), d))
  const dayStart = startOfUTCDate(theDay)
  const dayEnd = endOfUTCDate(theDay)

  const events = await prisma.event.findMany({
    where: ({ AND: [{ endAt: { gte: dayStart } }, { startAt: { lte: dayEnd } }, { deletedAt: null as any }, { NOT: { status: 'DRAFT' as any } }] } as any),
    include: { venue: true, categories: { include: { category: true } } },
    orderBy: { startAt: 'asc' },
  })

  const title = theDay.toUTCString().slice(0, 16)

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="hidden sm:flex gap-2">
            <a href={`/`} className="px-3 py-1.5 rounded border">Month</a>
            <a href={`/week`} className="px-3 py-1.5 rounded border">Week</a>
            <a href={`/day`} className="px-3 py-1.5 rounded border bg-black text-white border-black">Day</a>
            <a href={`/list`} className="px-3 py-1.5 rounded border">List</a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {events.length === 0 && (
            <div className="text-sm text-gray-600">No events for this day.</div>
          )}
          {events.map((ev: any) => (
            <a key={ev.id} href={`/event/${ev.slug}`} className="border rounded p-3 hover:bg-gray-50">
              <div className="text-xs text-gray-600 mb-1">
                {new Date(ev.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                {' - '}
                {new Date(ev.endAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
              <div className="font-medium">{ev.title}</div>
              {ev.venue?.name && (
                <div className="text-xs text-gray-600">{ev.venue.name}{ev.venue.city ? `, ${ev.venue.city}` : ''}</div>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
