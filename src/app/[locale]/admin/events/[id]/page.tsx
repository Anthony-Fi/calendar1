import { authOptions } from '@/auth'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'

function fmtDatetimeLocal(d: Date) {
  // YYYY-MM-DDTHH:mm for input[type=datetime-local]
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export default async function AdminEventEditPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi'; id: string }> }) {
  const { locale, id } = await params
  const session = await getServerSession(authOptions)
  const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  const userId = (session as any)?.user?.id as string | undefined
  if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
    redirect(`/${locale}`)
  }
  const isAdmin = role === 'ADMIN'
  const isModerator = role === 'MODERATOR'

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      createdBy: true,
    },
  })
  if (!event) redirect(`/${locale}/admin/events`)

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  async function saveEvent(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
      redirect('/')
    }

    const id = String(formData.get('id') || '')
    if (!id) redirect('/')

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const startStr = String(formData.get('startAt') || '')
    const endStr = String(formData.get('endAt') || '')
    const timezone = String(formData.get('timezone') || 'UTC').trim()
    const isOnline = formData.get('isOnline') === 'on'
    const priceCentsStr = String(formData.get('priceCents') || '').trim()
    const coverImage = String(formData.get('coverImage') || '').trim() || null
    const nextStatus = String(formData.get('status') || '')
    const featured = String(formData.get('isFeatured') || '') === 'on'
    const categoryIds = (formData.getAll('categories') || []).map((x) => String(x))

    const startAt = new Date(startStr)
    const endAt = new Date(endStr)
    if (!title || isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      redirect('back')
    }

    // Role-limited status change
    let statusData: any = {}
    if (nextStatus) {
      if (role === 'MODERATOR' && !new Set(['DRAFT', 'SCHEDULED']).has(nextStatus)) {
        // ignore illegal status update
      } else {
        const before = await prisma.event.findUnique({ where: { id }, select: { status: true } })
        if (before?.status !== nextStatus) {
          statusData.status = nextStatus as any
          await (prisma as any).eventAudit.create({ data: { eventId: id, userId: (session as any)?.user?.id || null, action: 'status_change', fromValue: before?.status ?? null, toValue: nextStatus } })
        }
      }
    }

    // Featured toggle only for admins
    let featureData: any = {}
    if (isAdmin) {
      const before = await prisma.event.findUnique({ where: { id }, select: { isFeatured: true } })
      const want = featured
      if (before?.isFeatured !== want) {
        featureData.isFeatured = want
        await (prisma as any).eventAudit.create({ data: { eventId: id, userId: (session as any)?.user?.id || null, action: 'feature_toggle', fromValue: String(before?.isFeatured ?? false), toValue: String(want) } })
      }
    }

    await prisma.event.update({
      where: { id },
      data: {
        title,
        description: description || null,
        startAt,
        endAt,
        timezone,
        isOnline,
        priceCents: priceCentsStr ? Math.max(0, parseInt(priceCentsStr, 10)) : null,
        coverImage,
        ...statusData,
        ...featureData,
      } as any,
    })

    // Update categories
    await prisma.eventCategory.deleteMany({ where: { eventId: id } })
    if (categoryIds.length) {
      await prisma.eventCategory.createMany({ data: categoryIds.map((cid) => ({ eventId: id, categoryId: cid })) })
    }

    redirect(`/${String(formData.get('locale') || locale)}/admin/events`)
  }

  const audits = await (prisma as any).eventAudit.findMany({
    where: { eventId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
    take: 50,
  })

  const selectedCatIds = new Set(event.categories.map((c: any) => c.categoryId))

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-semibold mb-4">Edit event</h1>
          <form action={saveEvent} className="space-y-4">
            <input type="hidden" name="id" value={event.id} />
            <input type="hidden" name="locale" value={locale} />
            <div>
              <label className="block text-sm mb-1" htmlFor="title">Title</label>
              <input id="title" name="title" defaultValue={event.title} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={5} defaultValue={event.description || ''} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" htmlFor="startAt">Start</label>
                <input id="startAt" name="startAt" type="datetime-local" defaultValue={fmtDatetimeLocal(new Date(event.startAt))} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="endAt">End</label>
                <input id="endAt" name="endAt" type="datetime-local" defaultValue={fmtDatetimeLocal(new Date(event.endAt))} className="w-full border rounded px-3 py-2" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" htmlFor="timezone">Timezone</label>
                <input id="timezone" name="timezone" defaultValue={event.timezone} className="w-full border rounded px-3 py-2" required />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input id="isOnline" name="isOnline" type="checkbox" defaultChecked={event.isOnline} />
                <label htmlFor="isOnline">Online event</label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" htmlFor="priceCents">Price (cents)</label>
                <input id="priceCents" name="priceCents" type="number" min={0} defaultValue={event.priceCents ?? ''} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="coverImage">Cover image URL</label>
                <input id="coverImage" name="coverImage" type="url" defaultValue={event.coverImage ?? ''} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div>
              <div className="text-sm mb-2">Categories</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="categories" value={c.id} defaultChecked={selectedCatIds.has(c.id)} />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={event.status as any} className="w-full border rounded px-3 py-2">
                  {/* Moderator limited to DRAFT & SCHEDULED */}
                  {isModerator ? (
                    <>
                      <option value="DRAFT">DRAFT</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                    </>
                  ) : (
                    <>
                      <option value="DRAFT">DRAFT</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="LIVE">LIVE</option>
                      <option value="SOLD_OUT">SOLD_OUT</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </>
                  )}
                </select>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 mt-6">
                  <input id="isFeatured" name="isFeatured" type="checkbox" defaultChecked={event.isFeatured} />
                  <label htmlFor="isFeatured">Featured</label>
                </div>
              )}
            </div>
            <div className="pt-2">
              <button type="submit" className="px-4 py-2 rounded border">Save</button>
              <a href={`/${locale}/admin/events`} className="ml-2 text-sm underline">Cancel</a>
            </div>
          </form>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Audit history</h2>
          {audits.length === 0 ? (
            <div className="text-sm text-gray-600">No changes recorded.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {audits.map((a: any) => (
                <div key={a.id} className="border rounded p-2">
                  <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  <div><span className="font-medium">{a.action}</span> {a.fromValue ? `(${a.fromValue} → ${a.toValue})` : a.toValue}</div>
                  <div className="text-xs text-gray-600">by {a.user?.email || 'system'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
