import prisma from '@/lib/db'

// Force dynamic rendering so this page is not prerendered at build time
// This avoids requiring DATABASE_URL during `next build`
export const dynamic = 'force-dynamic'

export default async function GroupsIndex({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }> }) {
  const { locale } = await params

  let orgs: any[] = []
  if (process.env.DATABASE_URL) {
    try {
      orgs = (await prisma.organizer.findMany({
        where: {},
        orderBy: { name: 'asc' },
      })) as any[]
    } catch (err) {
      // On build servers without DB, swallow and render empty list
      orgs = []
    }
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Groups & Organizations</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {orgs.map((o: any) => (
            <div key={o.id} className="border rounded-lg p-4 bg-white">
              <h2 className="font-semibold text-lg truncate">{o.name}</h2>
              {o.city || o.country ? (
                <div className="text-xs text-gray-600 mt-1">{[o.city, o.country].filter(Boolean).join(', ')}</div>
              ) : null}
              {o.bio && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">{o.bio}</p>
              )}
              <div className="mt-3 flex gap-2 text-sm">
                {o.slug ? (
                  <a className="underline" href={`/${locale}/groups/${o.slug}`}>View</a>
                ) : (
                  <span className="text-gray-400">No page yet</span>
                )}
                {o.url && (
                  <a className="underline" href={o.url} target="_blank" rel="noopener noreferrer">Website</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
