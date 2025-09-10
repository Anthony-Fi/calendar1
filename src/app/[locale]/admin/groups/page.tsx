import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function AdminGroupsPage({ params, searchParams }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params
  const session = await getServerSession(authOptions)
  const viewerRole = (session as any)?.user?.role as 'USER' | 'MODERATOR' | 'ADMIN' | undefined
  if (viewerRole !== 'ADMIN') {
    redirect(`/${locale}`)
  }

  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>
  const q = typeof sp?.q === 'string' ? (sp.q as string) : ''

  const where: any = q
    ? ({ OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ] } as any)
    : ({} as any)

  const orgs = (await prisma.organizer.findMany({
    where,
    orderBy: { name: 'asc' },
    include: ({ representative: true } as any),
  })) as any[]

  async function createOrganizer(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role
    if (role !== 'ADMIN') redirect('/')
    const name = String(formData.get('name') || '').trim()
    const slug = String(formData.get('slug') || '').trim() || null
    if (!name) return
    await prisma.organizer.create({ data: { name, slug } as any })
  }

  async function updateOrganizer(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role
    if (role !== 'ADMIN') redirect('/')
    const id = String(formData.get('id') || '')
    const name = String(formData.get('name') || '').trim()
    const slug = String(formData.get('slug') || '').trim() || null
    const url = String(formData.get('url') || '').trim() || null
    const email = String(formData.get('email') || '').trim() || null
    const phone = String(formData.get('phone') || '').trim() || null
    const bio = String(formData.get('bio') || '').trim() || null
    const address = String(formData.get('address') || '').trim() || null
    const city = String(formData.get('city') || '').trim() || null
    const region = String(formData.get('region') || '').trim() || null
    const country = String(formData.get('country') || '').trim() || null
    const postalCode = String(formData.get('postalCode') || '').trim() || null
    if (!id) return
    await prisma.organizer.update({
      where: { id },
      data: { name, slug, url, email, phone, bio, address, city, region, country, postalCode } as any,
    })
  }

  async function assignRepresentative(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const role = (session as any)?.user?.role
    if (role !== 'ADMIN') redirect('/')
    const id = String(formData.get('id') || '')
    const email = String(formData.get('repEmail') || '').trim()
    if (!id || !email) return
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return
    await prisma.organizer.update({ where: { id }, data: { representativeUserId: user.id } as any })
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin · Groups</h1>
          <form method="get" action={`/${locale}/admin/groups`} className="text-sm">
            <input name="q" defaultValue={q} placeholder="Search by name or slug" className="border rounded px-2 py-1" />
          </form>
        </div>

        <details className="border rounded p-4 bg-white">
          <summary className="font-semibold cursor-pointer">Create group</summary>
          <form action={createOrganizer} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <input name="name" placeholder="Name" className="border rounded px-2 py-1" required />
            <input name="slug" placeholder="slug (optional)" className="border rounded px-2 py-1" />
            <button className="px-3 py-1.5 rounded border" type="submit">Create</button>
          </form>
        </details>

        <div className="space-y-4">
          {orgs.map((o) => (
            <div key={o.id} className="border rounded p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-xs text-gray-600">{o.slug ? o.slug : <em>no slug</em>} · Rep: {o.representative?.email || <em>unset</em>}</div>
                </div>
                {o.slug && (
                  <a href={`/${locale}/groups/${o.slug}`} className="underline text-sm">View page</a>
                )}
              </div>

              <form action={updateOrganizer} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <input type="hidden" name="id" value={o.id} />
                <input name="name" defaultValue={o.name || ''} placeholder="Name" className="border rounded px-2 py-1" />
                <input name="slug" defaultValue={o.slug || ''} placeholder="slug" className="border rounded px-2 py-1" />
                <input name="url" defaultValue={o.url || ''} placeholder="Website URL" className="border rounded px-2 py-1" />
                <input name="email" defaultValue={o.email || ''} placeholder="Email" className="border rounded px-2 py-1" />
                <input name="phone" defaultValue={o.phone || ''} placeholder="Phone" className="border rounded px-2 py-1" />
                <input name="address" defaultValue={o.address || ''} placeholder="Address" className="border rounded px-2 py-1 sm:col-span-2" />
                <input name="city" defaultValue={o.city || ''} placeholder="City" className="border rounded px-2 py-1" />
                <input name="region" defaultValue={o.region || ''} placeholder="Region" className="border rounded px-2 py-1" />
                <input name="country" defaultValue={o.country || ''} placeholder="Country" className="border rounded px-2 py-1" />
                <input name="postalCode" defaultValue={o.postalCode || ''} placeholder="Postal Code" className="border rounded px-2 py-1" />
                <textarea name="bio" defaultValue={o.bio || ''} placeholder="Short description" className="border rounded px-2 py-1 sm:col-span-3" rows={3} />
                <div className="sm:col-span-3">
                  <button className="px-3 py-1.5 rounded border" type="submit">Save changes</button>
                </div>
              </form>

              <form action={assignRepresentative} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <input type="hidden" name="id" value={o.id} />
                <input name="repEmail" placeholder="Representative email" className="border rounded px-2 py-1" />
                <div className="sm:col-span-2">
                  <button className="px-3 py-1.5 rounded border" type="submit">Assign representative</button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
