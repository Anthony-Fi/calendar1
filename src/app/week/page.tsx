import prisma from '@/lib/db'

function startOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
}
function endOfUTCDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const now = new Date()
  const base = sp?.d ? new Date(sp.d as string) : now

  // Compute Monday..Sunday range in UTC
  const weekday = (base.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  const monday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - weekday))
  const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6))
  const weekStart = startOfUTCDate(monday)
  const weekEnd = endOfUTCDate(sunday)

  const events = await prisma.event.findMany({
    where: ({
      AND: [
        { endAt: { gte: weekStart } },
        { startAt: { lte: weekEnd } },
        { deletedAt: null as any },
        { NOT: { status: 'DRAFT' as any } },
      ],
    } as any),
    include: { venue: true, categories: { include: { category: true } } },
    orderBy: { startAt: 'asc' },
  })

  const days: { date: Date; items: typeof events }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
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

  const title = `Week of ${monday.toUTCString().slice(5, 16)}`

  function buildDayLink(d: Date) {
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    const dd = d.getUTCDate()
    return `/day?y=${y}&m=${m}&d=${dd}`
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="hidden sm:flex gap-2">
            <a href={`/`} className="px-3 py-1.5 rounded border">Month</a>
            <a href={`/week`} className="px-3 py-1.5 rounded border bg-black text-white border-black">Week</a>
            <a href={`/day`} className="px-3 py-1.5 rounded border">Day</a>
            <a href={`/list`} className="px-3 py-1.5 rounded border">List</a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((col, idx) => (
            <div key={idx} className="border rounded p-3 space-y-2 min-h-[140px]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{col.date.toUTCString().slice(0, 16)}</div>
                <a href={buildDayLink(col.date)} className="text-xs underline">View day</a>
              </div>
              <div className="flex flex-col gap-2">
                {col.items.length === 0 && (
                  <div className="text-xs text-gray-500">No events</div>
                )}
                {col.items.map((ev: any) => (
                  <a key={ev.id} href={`/event/${ev.slug}`} className="text-xs truncate rounded bg-gray-100 px-1 py-0.5 hover:bg-gray-200">
                    {new Date(ev.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} · {ev.title}
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
