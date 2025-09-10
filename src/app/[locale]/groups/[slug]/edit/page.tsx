import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { redirect } from 'next/navigation'

export default async function EditGroupPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi'; slug: string }> }) {
  const { locale, slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect(`/${locale}/login`)

  const org = (await prisma.organizer.findFirst({ where: ({ slug } as any) })) as any
  if (!org) redirect(`/${locale}/groups`)

  const isAdmin = (session as any).user?.role === 'ADMIN'
  const isRep = org.representativeUserId && org.representativeUserId === (session as any).user?.id
  if (!isAdmin && !isRep) redirect(`/${locale}/groups/${slug}`)

  async function updateOrganizer(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const { locale, slug } = Object.fromEntries(formData) as any
    const org = await prisma.organizer.findFirst({ where: ({ slug } as any) }) as any
    if (!org) redirect(`/${locale}/groups`)
    const isAdmin = (session as any).user?.role === 'ADMIN'
    const isRep = org.representativeUserId && org.representativeUserId === (session as any).user?.id
    if (!isAdmin && !isRep) redirect(`/${locale}/groups/${slug}`)

    const name = String(formData.get('name') || '').trim()
    const url = String(formData.get('url') || '').trim() || null
    const email = String(formData.get('email') || '').trim() || null
    const phone = String(formData.get('phone') || '').trim() || null
    const bio = String(formData.get('bio') || '').trim() || null
    const address = String(formData.get('address') || '').trim() || null
    const city = String(formData.get('city') || '').trim() || null
    const region = String(formData.get('region') || '').trim() || null
    const country = String(formData.get('country') || '').trim() || null
    const postalCode = String(formData.get('postalCode') || '').trim() || null

    await prisma.organizer.update({
      where: { id: org.id },
      data: { name, url, email, phone, bio, address, city, region, country, postalCode } as any,
    })
    redirect(`/${locale}/groups/${slug}`)
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Edit group</h1>
          <a className="underline text-sm" href={`/${locale}/groups/${slug}`}>Back to group</a>
        </div>

        <form action={updateOrganizer} className="grid grid-cols-1 gap-3 text-sm border rounded p-4 bg-white">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="slug" value={slug} />
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Name</span>
            <input name="name" defaultValue={org.name || ''} className="border rounded px-2 py-1" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Website</span>
            <input name="url" defaultValue={org.url || ''} className="border rounded px-2 py-1" />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Email</span>
              <input name="email" defaultValue={org.email || ''} className="border rounded px-2 py-1" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Phone</span>
              <input name="phone" defaultValue={org.phone || ''} className="border rounded px-2 py-1" />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Short description</span>
            <textarea name="bio" defaultValue={org.bio || ''} rows={4} className="border rounded px-2 py-1" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Address</span>
            <input name="address" defaultValue={org.address || ''} className="border rounded px-2 py-1" />
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">City</span>
              <input name="city" defaultValue={org.city || ''} className="border rounded px-2 py-1" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Region</span>
              <input name="region" defaultValue={org.region || ''} className="border rounded px-2 py-1" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Postal Code</span>
              <input name="postalCode" defaultValue={org.postalCode || ''} className="border rounded px-2 py-1" />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Country</span>
            <input name="country" defaultValue={org.country || ''} className="border rounded px-2 py-1" />
          </label>
          <div>
            <button className="px-3 py-1.5 rounded border" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
