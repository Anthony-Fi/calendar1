import prisma from '@/lib/db'
import TzSync from '@/components/TzSync'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import ShareButtons from '@/components/ShareButtons'

export const revalidate = 60

export default async function GroupDetailPage({ params, searchParams }: { params: Promise<{ locale: 'en' | 'sv' | 'fi'; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, slug } = await params
  const sp = await searchParams
  const tzParam = typeof sp?.tz === 'string' ? (sp.tz as string) : ''

  const org = (await prisma.organizer.findFirst({
    where: ({ slug } as any),
  })) as any
  if (!org) return notFound()

  const session = await getServerSession(authOptions)
  const isAdmin = ((session as any)?.user?.role === 'ADMIN') as boolean
  const isRep = !!(org.representativeUserId && (session as any)?.user?.id && org.representativeUserId === (session as any).user.id)

  const now = new Date()
  const upcoming = await prisma.event.findMany({
    where: ({ AND: [
      { organizer: { slug } },
      { deletedAt: null as any },
      { NOT: { status: 'DRAFT' as any } },
      { endAt: { gte: now } },
    ] } as any),
    orderBy: { startAt: 'asc' },
    include: { venue: true },
    take: 8,
  })

  const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/${locale}/groups/${slug}${tzParam ? `?tz=${encodeURIComponent(tzParam)}` : ''}`

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <TzSync />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <div className="flex items-center gap-3 text-sm">
            <ShareButtons title={org.name} url={shareUrl} />
            {(isAdmin || isRep) && (
              <a className="underline" href={`/${locale}/groups/${slug}/edit`}>Edit</a>
            )}
            <a href={`/${locale}${tzParam ? `?tz=${encodeURIComponent(tzParam)}` : ''}`} className="underline">Back to calendar</a>
          </div>
        </div>

        {org.bio && <p className="text-gray-800">{org.bio}</p>}

        <div className="text-sm text-gray-700 space-y-1">
          {org.address && <div>{org.address}</div>}
          {(org.city || org.region || org.postalCode) && (
            <div>{[org.postalCode, org.city, org.region].filter(Boolean).join(' ')}</div>
          )}
          {org.country && <div>{org.country}</div>}
          <div className="flex gap-3 mt-2">
            {org.url && <a href={org.url} target="_blank" rel="noopener noreferrer" className="underline">Website</a>}
            {org.email && <a href={`mailto:${org.email}`} className="underline">Email</a>}
            {org.phone && <a href={`tel:${org.phone}`} className="underline">Call</a>}
          </div>
        </div>

        {upcoming.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mt-6 mb-2">Upcoming events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcoming.map((ev) => (
                <div key={ev.id} className="border rounded-lg overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={`/${locale}/event/${ev.slug}${tzParam ? `?tz=${encodeURIComponent(tzParam)}` : ''}`} className="block">
                    <img src={ev.coverImage || `https://picsum.photos/seed/${encodeURIComponent(ev.slug)}/600/320`} alt={ev.title} className="w-full h-32 object-cover" />
                    <div className="p-3 space-y-1">
                      <div className="text-xs text-gray-600">{new Date(ev.startAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: tzParam || ev.timezone || 'UTC' })}</div>
                      <div className="text-sm font-semibold truncate">{ev.title}</div>
                      {ev.venue?.name && (
                        <div className="text-xs text-gray-600 truncate">{ev.venue.name}{ev.venue.city ? `, ${ev.venue.city}` : ''}</div>
                      )}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
