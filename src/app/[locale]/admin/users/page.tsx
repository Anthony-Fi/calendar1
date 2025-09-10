import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'
import CopyButton from '@/components/CopyButton'
import CopySelectedEmails from '@/components/CopySelectedEmails'
import CopyAllEmails from '@/components/CopyAllEmails'
import GeneratePasswordButton from '@/components/GeneratePasswordButton'

export default async function AdminUsersPage({ params, searchParams }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>

  const q = typeof sp?.q === 'string' ? sp.q : ''
  const role = typeof sp?.role === 'string' ? sp.role : ''
  const verified = sp?.verified === '1'
  const page = Math.max(1, parseInt((typeof sp?.page === 'string' ? sp.page : '1') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(10, parseInt((typeof sp?.pageSize === 'string' ? sp.pageSize : '50') || '50', 10) || 50))
  const optinOnly = sp?.optin === '1'

  const session = await getServerSession(authOptions)
  const roleOfViewer = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (roleOfViewer !== 'ADMIN') {
    redirect(`/${locale}`)
  }

  async function toggleOptIn(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
    if (role !== 'ADMIN') {
      redirect('/')
    }
    const uid = String(formData.get('uid') || '')
    const next = String(formData.get('next') || 'false') === 'true'
    if (!uid) return
    const before = await prisma.user.findUnique({ where: { id: uid }, select: { marketingOptIn: true } })
    await prisma.user.update({ where: { id: uid }, data: ({ marketingOptIn: next, marketingOptInAt: next ? new Date() : null } as any) })
    await (prisma as any).userAudit.create({
      data: {
        userId: uid,
        adminId: (session as any)?.user?.id || null,
        action: 'marketing_opt_in_toggle',
        fromValue: String(before?.marketingOptIn ?? false),
        toValue: String(next),
      },
    })
  }

  const where: any = {
    AND: [
      q
        ? ({ OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ] } as any)
        : ({} as any),
      role ? ({ role } as any) : ({} as any),
      verified ? ({ emailVerified: { not: null } } as any) : ({} as any),
      optinOnly ? ({ marketingOptIn: true } as any) : ({} as any),
    ],
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, marketingOptIn: true, marketingOptInAt: true },
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const visibleEmails = users.map((u) => u.email).filter(Boolean).join(', ')

  function buildUrl(overrides: Record<string, string | null | undefined>) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (q) params.set('q', q)
    if (role) params.set('role', role)
    if (verified) params.set('verified', '1')
    if (optinOnly) params.set('optin', '1')
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    return `/${locale}/admin/users?${params.toString()}`
  }

  function buildApiQuery() {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (role) params.set('role', role)
    if (verified) params.set('verified', '1')
    if (optinOnly) params.set('optin', '1')
    return params.toString()
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin · Users</h1>
          <div className="flex items-center gap-3 text-sm">
            <a href={`/${locale}/admin/users/requests`} className="underline">Access Requests</a>
          </div>
        </div>

        <form method="get" action={`/${locale}/admin/users`} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-end">
          <input name="q" defaultValue={q} placeholder="Name or email" className="border rounded px-2 py-1 text-sm sm:col-span-3" />
          <select name="role" defaultValue={role} className="border rounded px-2 py-1 text-sm">
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <label className="flex items-center gap-2 text-xs sm:col-span-1"><input type="checkbox" name="verified" value="1" defaultChecked={verified} /> Verified only</label>
          <label className="flex items-center gap-2 text-xs sm:col-span-1"><input type="checkbox" name="optin" value="1" defaultChecked={optinOnly} /> Opt-in only</label>
          <button className="px-2 py-1 rounded border text-sm sm:col-span-1" type="submit">Filter</button>
        </form>

        <div className="flex items-center gap-2 text-sm">
          <CopyButton text={visibleEmails} label="Copy emails (visible)" />
          <CopySelectedEmails containerId="usersTable" label="Copy emails (selected)" />
          <CopyAllEmails label="Copy emails (all)" apiPath={`/api/admin/users/emails?${buildApiQuery()}`} />
          <a className="px-2 py-1 rounded border text-sm" href={`/api/admin/users/export.csv?${buildApiQuery()}`} target="_blank" rel="noopener noreferrer">Download CSV</a>
        </div>

        <div id="usersTable" className="overflow-x-auto border rounded mt-2">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Pick</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Verified</th>
                <th className="text-left px-3 py-2">Opt-in</th>
                <th className="text-left px-3 py-2">Opt-in At</th>
                <th className="text-left px-3 py-2">Actions</th>
                <th className="text-left px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t" data-email={u.email || ''}>
                  <td className="px-3 py-2"><input type="checkbox" name="uids" value={u.id} /></td>
                  <td className="px-3 py-2">{u.name || '—'}</td>
                  <td className="px-3 py-2 font-mono">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.emailVerified ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{(u as any).marketingOptIn ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{(u as any).marketingOptInAt ? new Date((u as any).marketingOptInAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-3 py-2 space-y-1">
                    <form action={toggleOptIn}>
                      <input type="hidden" name="uid" value={u.id} />
                      <input type="hidden" name="next" value={String(!(u as any).marketingOptIn)} />
                      <button type="submit" className="px-2 py-1 rounded border text-xs">{(u as any).marketingOptIn ? 'Set opt-out' : 'Set opt-in'}</button>
                    </form>
                    <GeneratePasswordButton userId={u.id} />
                  </td>
                  <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
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
