import { authOptions } from '@/auth'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function AdminEventsPage({ params, searchParams }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>
  const statusFilter = typeof sp?.status === 'string' ? sp.status : ''
  const q = typeof sp?.q === 'string' ? sp.q : ''
  const createdFrom = typeof sp?.createdFrom === 'string' ? sp.createdFrom : ''
  const createdTo = typeof sp?.createdTo === 'string' ? sp.createdTo : ''
  const createdBy = typeof sp?.createdBy === 'string' ? sp.createdBy : ''
  const category = typeof sp?.category === 'string' ? sp.category : ''
  const featuredOnly = sp?.featured === '1'
  const deletedOnly = sp?.deleted === '1'
  const missingLocale = typeof sp?.missing === 'string' ? (sp.missing as 'sv'|'fi'|'en') : ''
  const page = Math.max(1, parseInt((typeof sp?.page === 'string' ? sp.page : '1') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(10, parseInt((typeof sp?.pageSize === 'string' ? sp.pageSize : '50') || '50', 10) || 50))
  const session = await getServerSession(authOptions)
  const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
    redirect(`/${locale}`)
  }

  async function deleteEvent(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (role !== 'ADMIN') redirect('/')
    const id = String(formData.get('id') || '')
    if (!id) return
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } as any })
    await (prisma as any).eventAudit.create({ data: { eventId: id, userId: (session as any)?.user?.id || null, action: 'delete', fromValue: null, toValue: 'deleted' } })
  }

  async function restoreEvent(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (role !== 'ADMIN') redirect('/')
    const id = String(formData.get('id') || '')
    if (!id) return
    await prisma.event.update({ where: { id }, data: { deletedAt: null } as any })
    await (prisma as any).eventAudit.create({ data: { eventId: id, userId: (session as any)?.user?.id || null, action: 'restore', fromValue: 'deleted', toValue: null } })
  }
  const isAdmin = role === 'ADMIN'
  const isModerator = role === 'MODERATOR'

  async function updateStatus(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
      redirect('/')
    }
    const id = String(formData.get('id') || '')
    const status = String(formData.get('status') || '') as any
    if (!id || !status) return
    // Moderators can only move between DRAFT and SCHEDULED
    if (role === 'MODERATOR') {
      const allowed = new Set(['DRAFT', 'SCHEDULED'])
      if (!allowed.has(status)) return
    }
    const before = await prisma.event.findUnique({ where: { id }, select: { status: true } })
    await prisma.event.update({ where: { id }, data: { status } as any })
    await (prisma as any).eventAudit.create({
      data: {
        eventId: id,
        userId: (session as any)?.user?.id || null,
        action: 'status_change',
        fromValue: before?.status ?? null,
        toValue: status,
      },
    })
  }

  async function toggleFeatured(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
      redirect('/')
    }
    // Only admins can toggle Featured
    if (role === 'MODERATOR') return
    const id = String(formData.get('id') || '')
    const featured = String(formData.get('featured') || 'false') === 'true'
    if (!id) return
    const before = await prisma.event.findUnique({ where: { id }, select: { isFeatured: true } })
    await prisma.event.update({ where: { id }, data: { isFeatured: featured } })
    await (prisma as any).eventAudit.create({
      data: {
        eventId: id,
        userId: (session as any)?.user?.id || null,
        action: 'feature_toggle',
        fromValue: String(before?.isFeatured ?? false),
        toValue: String(featured),
      },
    })
  }

  async function bulkAction(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
      redirect('/')
    }
    const action = String(formData.get('action') || '')
    const ids = (formData.getAll('ids') || []).map((x) => String(x)).filter(Boolean)
    if (!action || ids.length === 0) return
    if (action.startsWith('set_status:')) {
      const nextStatus = action.split(':')[1]
      if (!nextStatus) return
      if (role === 'MODERATOR' && !new Set(['DRAFT','SCHEDULED']).has(nextStatus)) return
      const before = await prisma.event.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } })
      await prisma.event.updateMany({ where: { id: { in: ids } }, data: { status: nextStatus as any } })
      await Promise.all(before.map((b) => (prisma as any).eventAudit.create({ data: { eventId: b.id, userId: (session as any)?.user?.id || null, action: 'status_change', fromValue: b.status as any, toValue: nextStatus } })))
    } else if (action === 'feature:1' || action === 'feature:0') {
      if (role !== 'ADMIN') return
      const value = action.endsWith(':1')
      const before = await prisma.event.findMany({ where: { id: { in: ids } }, select: { id: true, isFeatured: true } })
      await prisma.event.updateMany({ where: { id: { in: ids } }, data: { isFeatured: value } })
      await Promise.all(before.map((b) => (prisma as any).eventAudit.create({ data: { eventId: b.id, userId: (session as any)?.user?.id || null, action: 'feature_toggle', fromValue: String(b.isFeatured), toValue: String(value) } })))
    } else if (action === 'delete') {
      if (role !== 'ADMIN') return
      const now = new Date()
      await prisma.event.updateMany({ where: { id: { in: ids } }, data: { deletedAt: now } as any })
      await Promise.all(ids.map((id) => (prisma as any).eventAudit.create({ data: { eventId: id, userId: (session as any)?.user?.id || null, action: 'delete', fromValue: null, toValue: 'deleted' } })))
    } else if (action === 'restore') {
      if (role !== 'ADMIN') return
      await prisma.event.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } as any })
      await Promise.all(ids.map((id) => (prisma as any).eventAudit.create({ data: { eventId: id, userId: (session as any)?.user?.id || null, action: 'restore', fromValue: 'deleted', toValue: null } })))
    }
  }

  // Build filters
  const where = {
    AND: [
      statusFilter ? ({ status: statusFilter as any } as any) : ({} as any),
      q ? ({ OR: [ { title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } } ] } as any) : ({} as any),
      createdFrom || createdTo ? ({ AND: [ createdFrom ? { createdAt: { gte: new Date(createdFrom) } } : {}, createdTo ? { createdAt: { lte: new Date(createdTo) } } : {} ] } as any) : ({} as any),
      createdBy ? ({ createdBy: { email: { contains: createdBy, mode: 'insensitive' } } } as any) : ({} as any),
      category ? ({ categories: { some: { category: { slug: category } } } } as any) : ({} as any),
      featuredOnly ? ({ isFeatured: true } as any) : ({} as any),
      deletedOnly ? ({ NOT: { deletedAt: null as any } } as any) : ({ deletedAt: null as any } as any),
      missingLocale ? ({ translations: { none: { locale: missingLocale } } } as any) : ({} as any),
    ],
  } as any

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { categories: { include: { category: true } }, createdBy: true, translations: true as any } as any,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Admin · Events</h1>
          <a href={`/${locale}/admin/users`} className="text-sm underline">Users</a>
        </div>
        <div className="flex items-center gap-2 text-sm mb-3">
          <a href={`/${locale}/admin/events${q || missingLocale ? `?${new URLSearchParams({ ...(q?{q}:{}) as any, ...(missingLocale?{missing: missingLocale}:{}) as any }).toString()}` : ''}`} className={`px-3 py-1.5 rounded border ${!statusFilter ? 'bg-black text-white border-black' : ''}`}>All</a>
          {['DRAFT','SCHEDULED','LIVE','SOLD_OUT','CANCELLED'].map(s => (
            <a key={s} href={`/${locale}/admin/events?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}${missingLocale ? `&missing=${missingLocale}` : ''}`} className={`px-3 py-1.5 rounded border ${statusFilter===s ? 'bg-black text-white border-black' : ''}`}>{s.replace('_',' ')}</a>
          ))}
          <a href={`/${locale}/admin/events?deleted=1${statusFilter ? `&status=${statusFilter}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}${missingLocale ? `&missing=${missingLocale}` : ''}`} className={`px-3 py-1.5 rounded border ${deletedOnly ? 'bg-red-600 text-white border-red-600' : ''}`}>Trash</a>
          <form method="get" action={`/${locale}/admin/events`} className="ml-auto grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <input name="q" defaultValue={q} placeholder="Title or slug" className="border rounded px-2 py-1 text-sm sm:col-span-2" />
            <input type="date" name="createdFrom" defaultValue={createdFrom} className="border rounded px-2 py-1 text-sm" />
            <input type="date" name="createdTo" defaultValue={createdTo} className="border rounded px-2 py-1 text-sm" />
            <input name="createdBy" defaultValue={createdBy} placeholder="Creator email" className="border rounded px-2 py-1 text-sm" />
            <input name="category" defaultValue={category} placeholder="Category slug" className="border rounded px-2 py-1 text-sm" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="featured" value="1" defaultChecked={featuredOnly} /> Featured</label>
            <select name="missing" defaultValue={missingLocale} className="border rounded px-2 py-1 text-sm">
              <option value="">Missing: (any)</option>
              <option value="sv">Missing: Swedish</option>
              <option value="fi">Missing: Finnish</option>
              <option value="en">Missing: English</option>
            </select>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded border text-sm" type="submit">Filter</button>
              <a href={`/${locale}/admin/events`} className="px-2 py-1 rounded border text-sm">Reset</a>
            </div>
          </form>
        </div>
        {/* Bulk actions bar */}
        <form id="bulkForm" action={bulkAction} className="flex items-center gap-2 mb-2">
          <select name="action" className="border rounded px-2 py-1 text-sm">
            <option value="">Bulk action…</option>
            <option value="set_status:DRAFT">Set status: DRAFT</option>
            <option value="set_status:SCHEDULED">Set status: SCHEDULED</option>
            {!isModerator && (
              <>
                <option value="set_status:LIVE">Set status: LIVE</option>
                <option value="set_status:SOLD_OUT">Set status: SOLD_OUT</option>
                <option value="set_status:CANCELLED">Set status: CANCELLED</option>
                <option value="feature:1">Feature</option>
                <option value="feature:0">Unfeature</option>
                <option value="delete">Delete</option>
                <option value="restore">Restore</option>
              </>
            )}
          </select>
          <button type="submit" className="px-2 py-1 rounded border text-sm">Apply</button>
          <span className="text-xs text-gray-500">Select rows below to apply</span>
        </form>
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Sel</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Featured</th>
                <th className="text-left px-3 py-2">Created By</th>
                <th className="text-left px-3 py-2">Start</th>
                <th className="text-left px-3 py-2">Deleted</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-t">
                  <td className="px-3 py-2"><input type="checkbox" name="ids" value={ev.id} form="bulkForm" /></td>
                  <td className="px-3 py-2">
                    <a className="underline" href={`/${locale}/event/${ev.slug}`}>{ev.title}</a>
                    <div className="text-xs text-gray-500">{(ev as any).categories.map((c: any) => c.category.name).join(', ')}</div>
                    {/* Translation availability chips */}
                    {(() => {
                      const tr = ((ev as any).translations || []) as Array<{ locale: string }>
                      const has = (loc: 'sv'|'fi'|'en') => tr.some(t => t.locale === loc)
                      const Chip = ({ loc }: { loc: 'sv'|'fi'|'en' }) => (
                        <span className={[
                          'inline-block text-[10px] px-1.5 py-0.5 mr-1 rounded border',
                          has(loc) ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-600',
                        ].join(' ')}>{loc.toUpperCase()}</span>
                      )
                      return (
                        <div className="mt-1">
                          <Chip loc="sv" />
                          <Chip loc="fi" />
                          <Chip loc="en" />
                          <a className="ml-2 underline" href={`/${locale}/admin/events/${ev.id}`}>Edit translations</a>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <form action={updateStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={ev.id} />
                      <select name="status" defaultValue={ev.status} className="border rounded px-2 py-1">
                        {/* Moderators limited to DRAFT and SCHEDULED; Admin sees all */}
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
                      <button type="submit" className="px-2 py-1 rounded border">Save</button>
                    </form>
                  </td>
                  <td className="px-3 py-2">
                    {isModerator ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{ev.isFeatured ? 'Yes' : 'No'}</span>
                        <span className="text-xs text-gray-500" title="Moderators cannot change Featured">(read-only)</span>
                      </div>
                    ) : (
                      <form action={toggleFeatured} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={ev.id} />
                        <input type="hidden" name="featured" value={String(!ev.isFeatured)} />
                        <span className="text-xs mr-2">{ev.isFeatured ? 'Yes' : 'No'}</span>
                        <button type="submit" className="px-2 py-1 rounded border">{ev.isFeatured ? 'Unfeature' : 'Feature'}</button>
                      </form>
                    )}
                  </td>
                  <td className="px-3 py-2">{(ev as any).createdBy?.email || '—'}</td>
                  <td className="px-3 py-2">{new Date(ev.startAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-3 py-2 text-xs">{(ev as any).deletedAt ? new Date((ev as any).deletedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-3 py-2 flex gap-3">
                    <a className="underline" href={`/${locale}/event/${ev.slug}`}>View</a>
                    <a className="underline" href={`/${locale}/admin/events/${ev.id}`}>Edit</a>
                    {isAdmin && !(ev as any).deletedAt && (
                      <form action={deleteEvent}>
                        <input type="hidden" name="id" value={ev.id} />
                        <button className="underline text-red-600" type="submit">Delete</button>
                      </form>
                    )}
                    {isAdmin && (ev as any).deletedAt && (
                      <form action={restoreEvent}>
                        <input type="hidden" name="id" value={ev.id} />
                        <button className="underline" type="submit">Restore</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 text-sm">
          <div>Page {page} of {totalPages} · {total} total</div>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <a className="px-2 py-1 rounded border" href={`/${locale}/admin/events?${new URLSearchParams({ ...(statusFilter?{status:statusFilter}:{}) as any, ...(q?{q}:{}) as any, ...(createdFrom?{createdFrom}:{}) as any, ...(createdTo?{createdTo}:{}) as any, ...(createdBy?{createdBy}:{}) as any, ...(category?{category}:{}) as any, ...(featuredOnly?{featured:'1'}:{}) as any, ...(missingLocale?{missing:missingLocale}:{}) as any, page: String(page-1), pageSize: String(pageSize) }).toString()}`}>Prev</a>
            )}
            {page < totalPages && (
              <a className="px-2 py-1 rounded border" href={`/${locale}/admin/events?${new URLSearchParams({ ...(statusFilter?{status:statusFilter}:{}) as any, ...(q?{q}:{}) as any, ...(createdFrom?{createdFrom}:{}) as any, ...(createdTo?{createdTo}:{}) as any, ...(createdBy?{createdBy}:{}) as any, ...(category?{category}:{}) as any, ...(featuredOnly?{featured:'1'}:{}) as any, ...(missingLocale?{missing:missingLocale}:{}) as any, page: String(page+1), pageSize: String(pageSize) }).toString()}`}>Next</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
