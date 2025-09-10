import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function AccessRequestsPage({ params, searchParams }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>

  const status = typeof sp?.status === 'string' ? sp.status : 'open' // open | all
  const q = typeof sp?.q === 'string' ? sp.q : ''
  const page = Math.max(1, parseInt((typeof sp?.page === 'string' ? sp.page : '1') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(10, parseInt((typeof sp?.pageSize === 'string' ? sp.pageSize : '50') || '50', 10) || 50))

  const session = await getServerSession(authOptions)
  const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) redirect(`/${locale}`)

  async function approve(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) redirect('/')
    const id = String(formData.get('id') || '')
    if (!id) return
    const req = await (prisma as any).accessRequest.findUnique({ where: { id }, select: { id: true, email: true, name: true, consent: true } })
    if (!req) return
    let user = await prisma.user.findUnique({ where: { email: req.email } })
    if (!user) {
      user = await prisma.user.create({ data: { email: req.email, name: req.name, role: 'USER' as any, marketingOptIn: !!req.consent } })
    } else if (req.consent && !(user as any).marketingOptIn) {
      await prisma.user.update({ where: { id: user.id }, data: ({ marketingOptIn: true, marketingOptInAt: new Date() } as any) })
    }
    await (prisma as any).accessRequest.update({ where: { id }, data: { processedAt: new Date(), processedBy: (session as any)?.user?.id || null } })
    await (prisma as any).userAudit.create({ data: { userId: user.id, adminId: (session as any)?.user?.id || null, action: 'access_request_approved', fromValue: null, toValue: 'approved' } })
  }

  async function deny(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) redirect('/')
    const id = String(formData.get('id') || '')
    if (!id) return
    await prisma.accessRequest.update({ where: { id }, data: { processedAt: new Date(), processedBy: (session as any)?.user?.id || null } })
  }

  const where: any = {
    AND: [
      q ? ({ OR: [ { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { group: { contains: q, mode: 'insensitive' } }, { location: { contains: q, mode: 'insensitive' } } ] } as any) : ({} as any),
      status === 'open' ? ({ processedAt: null } as any) : ({} as any),
    ],
  }

  const [items, total] = await Promise.all([
    (prisma as any).accessRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { processedByUser: true } }),
    (prisma as any).accessRequest.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  function buildUrl(overrides: Record<string, string | null | undefined>) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    return `/${locale}/admin/users/requests?${params.toString()}`
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Access Requests</h1>
          <div className="flex items-center gap-2 text-sm">
            <a href={`/${locale}/admin/users`} className="underline">Users</a>
          </div>
        </div>

        <form method="get" action={`/${locale}/admin/users/requests`} className="flex items-end gap-2 text-sm">
          <input name="q" defaultValue={q} placeholder="Search name/email/group/location" className="border rounded px-2 py-1" />
          <select name="status" defaultValue={status} className="border rounded px-2 py-1">
            <option value="open">Open</option>
            <option value="all">All</option>
          </select>
          <button type="submit" className="px-2 py-1 rounded border">Filter</button>
        </form>

        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Group</th>
                <th className="text-left px-3 py-2">Location</th>
                <th className="text-left px-3 py-2">Consent</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Processed By</th>
                <th className="text-left px-3 py-2">Processed</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 font-mono">{r.email}</td>
                  <td className="px-3 py-2">{r.group || '—'}</td>
                  <td className="px-3 py-2">{r.location || '—'}</td>
                  <td className="px-3 py-2">{r.consent ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-3 py-2">{r.processedByUser?.email || r.processedByUser?.name || (r.processedAt ? '—' : '—')}</td>
                  <td className="px-3 py-2">{r.processedAt ? new Date(r.processedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-3 py-2">
                    {!r.processedAt ? (
                      <div className="flex items-center gap-2">
                        <form action={approve}><input type="hidden" name="id" value={r.id} /><button type="submit" className="px-2 py-1 rounded border">Approve</button></form>
                        <form action={deny}><input type="hidden" name="id" value={r.id} /><button type="submit" className="px-2 py-1 rounded border">Deny</button></form>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</div>
          <div className="flex gap-2">
            <a aria-disabled={!hasPrev} className={`px-3 py-1.5 rounded border ${!hasPrev ? 'opacity-50 pointer-events-none' : ''}`} href={buildUrl({ page: String(page - 1) })}>Prev</a>
            <span>Page {page} / {totalPages}</span>
            <a aria-disabled={!hasNext} className={`px-3 py-1.5 rounded border ${!hasNext ? 'opacity-50 pointer-events-none' : ''}`} href={buildUrl({ page: String(page + 1) })}>Next</a>
          </div>
        </div>
      </div>
    </div>
  )
}
