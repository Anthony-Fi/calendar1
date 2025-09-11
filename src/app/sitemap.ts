import type { MetadataRoute } from 'next'
import prisma from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const locales: Array<'en'|'sv'|'fi'> = ['en','sv','fi']

  let events: any[] = []
  let groups: any[] = []
  if (process.env.DATABASE_URL) {
    try {
      events = (await prisma.event.findMany({
        where: ({ deletedAt: null as any, NOT: { status: 'DRAFT' as any } } as any),
        select: ({ slug: true, updatedAt: true } as any),
        orderBy: { updatedAt: 'desc' },
        take: 500,
      })) as any[]
      groups = (await prisma.organizer.findMany({
        where: ({ slug: { not: null } } as any),
        select: ({ slug: true, updatedAt: true } as any),
        orderBy: { updatedAt: 'desc' },
        take: 200,
      })) as any[]
    } catch (err) {
      // If DB is unavailable during build, fall back to static paths only
      events = []
      groups = []
    }
  }

  const staticPaths = locales.flatMap((loc) => ([
    { url: `${base}/${loc}`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${base}/${loc}/list`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${base}/${loc}/week`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${base}/${loc}/day`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${base}/${loc}/groups`, changeFrequency: 'weekly' as const, priority: 0.5 },
  ]))

  const eventPaths = events.flatMap((e) => locales.map((loc) => ({
    url: `${base}/${loc}/event/${e.slug}`,
    lastModified: e.updatedAt || new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  })))

  const groupPaths = groups.flatMap((g) => locales.map((loc) => ({
    url: `${base}/${loc}/groups/${g.slug}`,
    lastModified: g.updatedAt || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  })))

  return [...staticPaths, ...eventPaths, ...groupPaths]
}
