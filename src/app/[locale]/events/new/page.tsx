import { authOptions } from '@/auth'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'
import EventCreateForm from '@/components/EventCreateForm'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default async function NewEventPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }> }) {
  const { locale } = await params
  const session = await getServerSession(authOptions)
  const userId = (session as any)?.user?.id as string | undefined
  const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (!userId) {
    redirect(`/${locale}/login`)
  }

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  async function createEvent(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const userId = (session as any)?.user?.id as string | undefined
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!userId) redirect('/')

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const startStr = String(formData.get('startAt') || '')
    const endStr = String(formData.get('endAt') || '')
    const timezone = String(formData.get('timezone') || 'Europe/Helsinki').trim()
    const isOnline = formData.get('isOnline') === 'on'
    const venueName = String(formData.get('venueName') || '').trim()
    const venueAddress = String(formData.get('venueAddress') || '').trim()
    const venueCity = String(formData.get('venueCity') || '').trim()
    const venuePostal = String(formData.get('venuePostalCode') || '').trim()
    const priceCentsStr = String(formData.get('priceCents') || '').trim()
    const coverImage = String(formData.get('coverImage') || '').trim() || null
    const categoryIds = (formData.getAll('categories') || []).map((x) => String(x))
    const publishNow = String(formData.get('publishNow') || '') === 'on'

    if (!title || !startStr || !endStr || !timezone) {
      redirect(`/${locale}/events/new?error=missing_fields`)
    }

    const startAt = new Date(startStr)
    const endAt = new Date(endStr)
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      redirect(`/${locale}/events/new?error=invalid_datetime`)
    }

    let baseSlug = slugify(title)
    if (!baseSlug) baseSlug = 'event'
    let slug = baseSlug
    let i = 1
    // ensure unique slug
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++i}`
    }

    const priceCents = priceCentsStr ? Math.max(0, parseInt(priceCentsStr, 10)) : null

    let venueId: string | null = null
    if (!isOnline) {
      if (venueName && venueAddress && venueCity && venuePostal) {
        const existing = await prisma.venue.findFirst({ where: { name: venueName, address: venueAddress, city: venueCity, postalCode: venuePostal } })
        if (existing) venueId = existing.id
        else {
          const v = await prisma.venue.create({ data: { name: venueName, address: venueAddress, city: venueCity, postalCode: venuePostal } })
          venueId = v.id
        }
      }
    }

    const created = await prisma.event.create({
      data: {
        title,
        slug,
        description: description || null,
        startAt,
        endAt,
        timezone,
        // Publish immediately only if allowed (MODERATOR/ADMIN)
        ...(publishNow && (role === 'MODERATOR' || role === 'ADMIN') ? { status: 'SCHEDULED' as any } : {}),
        isOnline,
        priceCents,
        coverImage,
        createdByUserId: userId,
        venueId: isOnline ? null : venueId,
      } as any,
    })

    if (categoryIds.length) {
      const cats = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
      if (cats.length) {
        await prisma.eventCategory.createMany({
          data: cats.map((c) => ({ eventId: created.id, categoryId: c.id })),
        })
      }
    }

    redirect(`/${locale}/me/events`)
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Create event</h1>
        <EventCreateForm locale={locale} categories={categories} action={createEvent} canPublishNow={role === 'MODERATOR' || role === 'ADMIN'} />
      </div>
    </div>
  )
}
