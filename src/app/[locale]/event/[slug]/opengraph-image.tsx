import { ImageResponse } from 'next/og'
import prisma from '@/lib/db'

export const runtime = 'nodejs'
export const alt = 'Event Open Graph Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi'; slug: string }> }) {
  const { locale, slug } = await params
  const event = (await prisma.event.findFirst({
    where: ({ slug, deletedAt: null as any } as any),
    include: { venue: true },
  })) as any

  const title = event?.title ?? 'Event'
  const dateStr = event ? new Date(event.startAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : ''
  const venueStr = event?.venue?.name ? `${event.venue.name}${event.venue.city ? ', ' + event.venue.city : ''}` : ''
  const cover = event?.coverImage || null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#0b0b0b',
          color: '#ffffff',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt="bg"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }}
          />
        ) : null}
        <div
          style={{ position: 'absolute', inset: 0, padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}
        >
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ display: 'flex', gap: 24, fontSize: 28, opacity: 0.95 }}>
            {dateStr ? <div>{dateStr}</div> : null}
            {venueStr ? <div>· {venueStr}</div> : null}
          </div>
          <div style={{ marginTop: 8, fontSize: 24, opacity: 0.85 }}>loviisa.online</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
