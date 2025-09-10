import { authOptions } from '@/auth'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function MyEventsPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }> }) {
  const { locale } = await params
  const session = await getServerSession(authOptions)
  const userId = (session as any)?.user?.id as string | undefined
  if (!userId) {
    redirect(`/${locale}/login`)
  }

  const events = (await prisma.event.findMany({
    where: ({ createdByUserId: userId, deletedAt: null as any } as any),
    orderBy: { createdAt: 'desc' },
    include: { venue: true, categories: { include: { category: true } } },
  })) as any[]

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">My events</h1>
        {events.length === 0 ? (
          <div className="text-gray-600">No events yet.</div>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <a key={ev.id} href={`/${locale}/event/${ev.slug}`} className="block border rounded p-3 hover:bg-gray-50">
                <div className="text-sm text-gray-600 mb-1">{new Date(ev.startAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                <div className="font-medium">{ev.title}</div>
                {ev.venue?.name && (
                  <div className="text-xs text-gray-600">{ev.venue.name}{ev.venue.city ? `, ${ev.venue.city}` : ''}</div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
