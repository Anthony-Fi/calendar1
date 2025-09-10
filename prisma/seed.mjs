import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function addHours(date, h) {
  const d = new Date(date)
  d.setHours(d.getHours() + h)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  // Categories
  const categories = [
    // Core
    { name: 'General', slug: 'general', color: '#0ea5e9' },
    { name: 'Music', slug: 'music', color: '#22c55e' },
    { name: 'Art', slug: 'art', color: '#a855f7' },
    { name: 'Tech', slug: 'tech', color: '#3b82f6' },
    { name: 'Sports', slug: 'sports', color: '#ef4444' },
    { name: 'Food', slug: 'food', color: '#f59e0b' },
    { name: 'Theatre', slug: 'theatre', color: '#8b5cf6' },

    // Culture & Heritage
    { name: 'Culture & Heritage', slug: 'culture-heritage', color: '#6b7280' },
    { name: 'Historical tours', slug: 'historical-tours', color: '#065f46' },
    { name: 'Museum exhibitions', slug: 'museum-exhibitions', color: '#2563eb' },
    { name: 'Local history lectures', slug: 'local-history-lectures', color: '#1f2937' },
    { name: 'Traditional Finnish crafts', slug: 'traditional-finnish-crafts', color: '#92400e' },

    // Music & Performing Arts
    { name: 'Classical concerts', slug: 'classical-concerts', color: '#1e3a8a' },
    { name: 'Folk music nights', slug: 'folk-music', color: '#166534' },
    { name: 'Theater performances', slug: 'theater-performances', color: '#7c3aed' },
    { name: 'Dance events', slug: 'dance-events', color: '#db2777' },

    // Arts & Crafts
    { name: 'Art exhibitions & openings', slug: 'art-exhibitions', color: '#a855f7' },
    { name: 'Wreath-making workshops', slug: 'wreath-workshops', color: '#16a34a' },
    { name: 'Pottery/Painting/Textile', slug: 'craft-classes', color: '#ea580c' },

    // Nature & Outdoors
    { name: 'Guided nature walks', slug: 'nature-walks', color: '#0d9488' },
    { name: 'Coastal & forest hikes', slug: 'hikes', color: '#065f46' },
    { name: 'Gardening & permaculture', slug: 'gardening-permaculture', color: '#65a30d' },

    // Food & Drink
    { name: 'Local food markets', slug: 'food-markets', color: '#f59e0b' },
    { name: 'Wine/Beer tastings', slug: 'tastings', color: '#7f1d1d' },
    { name: 'Seasonal food festivals', slug: 'seasonal-food-festivals', color: '#ea580c' },

    // Wellness & Lifestyle
    { name: 'Yoga & meditation', slug: 'yoga-meditation', color: '#14b8a6' },
    { name: 'Wellness retreats', slug: 'wellness-retreats', color: '#a3e635' },
    { name: 'Sauna culture events', slug: 'sauna-events', color: '#92400e' },

    // Community & Seasonal
    { name: 'Midsummer (Juhannus)', slug: 'midsummer', color: '#fbbf24' },
    { name: 'Christmas & Advent', slug: 'christmas-advent', color: '#047857' },
    { name: 'Fairs & Flea markets', slug: 'fairs-flea-markets', color: '#e11d48' },
    { name: 'Volunteer & charity', slug: 'volunteer-charity', color: '#4b5563' },

    // Family & Kids
    { name: 'Puppet & storytelling', slug: 'puppet-storytelling', color: '#2563eb' },
    { name: 'Kids crafting', slug: 'kids-crafting', color: '#fb7185' },
    { name: 'Family nature outings', slug: 'family-nature', color: '#22d3ee' },

    // Business & Tech
    { name: 'Entrepreneur meetups', slug: 'entrepreneur-meetups', color: '#334155' },
    { name: 'Workshops', slug: 'workshops', color: '#0ea5e9' },
    { name: 'Tech events', slug: 'tech-events', color: '#3b82f6' },

    // Town events & open days
    { name: 'Town events & open days', slug: 'town-events-open-days', color: '#6d28d9' },
  ]
  const cats = {}
  for (const c of categories) {
    cats[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { color: c.color, name: c.name },
      create: c,
    })
  }
  // Venues
  const venues = await Promise.all([
    prisma.venue.upsert({
      where: { id: 'v_main' },
      update: {},
      create: {
        id: 'v_main',
        name: 'Main Hall',
        address: '123 Center St',
        city: 'Metropolis',
        country: 'US',
        lat: 40.7128,
        lng: -74.006,
        url: 'https://example.com/venue',
      },
    }),
    prisma.venue.upsert({
      where: { id: 'v_park' },
      update: {},
      create: {
        id: 'v_park',
        name: 'City Park',
        address: '500 Park Ave',
        city: 'Metropolis',
        country: 'US',
      },
    }),
    prisma.venue.upsert({
      where: { id: 'v_hub' },
      update: {},
      create: {
        id: 'v_hub',
        name: 'Tech Hub',
        address: '1 Innovation Way',
        city: 'Silicon City',
        country: 'US',
      },
    }),
    prisma.venue.upsert({
      where: { id: 'v_gallery' },
      update: {},
      create: {
        id: 'v_gallery',
        name: 'Art Gallery',
        address: '77 Canvas St',
        city: 'Old Town',
        country: 'US',
      },
    }),
  ])

  // Demo admin user (credentials: admin@example.com / admin123)
  const adminEmail = 'admin@example.com'
  const adminPassHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPassHash, role: 'ADMIN', name: 'Admin' },
    create: { email: adminEmail, passwordHash: adminPassHash, role: 'ADMIN', name: 'Admin' },
  })

  // Organizer
  const organizer = await prisma.organizer.upsert({
    where: { id: 'org_city' },
    update: {},
    create: {
      id: 'org_city',
      name: 'City Events',
      bio: 'Local event organizer',
      url: 'https://example.com/organizer',
      email: 'info@example.com',
    },
  })

  const now = new Date()
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const busyDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(15, new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate())))

  // Helper to create event
  async function createEvent({
    title,
    slug,
    start,
    durationHours = 2,
    venueId,
    catSlugs = [],
    status = 'SCHEDULED',
    featured = false,
    cover = null,
    isOnline = false,
    priceCents = null,
    timezone = 'UTC',
  }) {
    const event = await prisma.event.upsert({
      where: { slug },
      update: {},
      create: {
        title,
        slug,
        description: `${title} - a sample seeded event`,
        startAt: start,
        endAt: addHours(start, durationHours),
        timezone,
        status,
        isFeatured: featured,
        coverImage: cover,
        isOnline,
        priceCents,
        currency: 'USD',
        venueId: isOnline ? null : venueId,
        organizerId: organizer.id,
      },
    })
    if (catSlugs.length) {
      // Ensure idempotency without skipDuplicates (not supported on SQLite)
      await prisma.eventCategory.deleteMany({ where: { eventId: event.id } })
      await prisma.eventCategory.createMany({
        data: catSlugs.map((s) => ({ eventId: event.id, categoryId: cats[s].id })),
      })
    }
    return event
  }

  // Featured events across the month
  await createEvent({
    title: 'Welcome Launch Event',
    slug: 'welcome-launch-event',
    start: addHours(thisMonthStart, 18),
    featured: true,
    venueId: 'v_main',
    catSlugs: ['general', 'music'],
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
    timezone: 'UTC',
  })
  await createEvent({
    title: 'Tech Meetup',
    slug: 'tech-meetup',
    start: addHours(thisMonthStart, 24 * 3 + 19),
    venueId: 'v_hub',
    catSlugs: ['tech'],
    cover: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop',
    timezone: 'UTC',
  })
  await createEvent({
    title: 'Outdoor Concert',
    slug: 'outdoor-concert',
    start: addHours(thisMonthStart, 24 * 6 + 20),
    venueId: 'v_park',
    catSlugs: ['music'],
    cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1200&auto=format&fit=crop',
    featured: true,
    timezone: 'UTC',
  })
  await createEvent({
    title: 'Art Exhibition',
    slug: 'art-exhibition',
    start: addHours(thisMonthStart, 24 * 10 + 17),
    venueId: 'v_gallery',
    catSlugs: ['art'],
    status: 'LIVE',
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
    timezone: 'UTC',
  })
  await createEvent({
    title: 'Food Festival',
    slug: 'food-festival',
    start: addHours(thisMonthStart, 24 * 12 + 12),
    venueId: 'v_park',
    catSlugs: ['food'],
    status: 'SOLD_OUT',
    cover: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?q=80&w=1200&auto=format&fit=crop',
    timezone: 'UTC',
  })
  await createEvent({
    title: 'Online Webinar: Future of JS',
    slug: 'webinar-future-js',
    start: addHours(thisMonthStart, 24 * 8 + 16),
    isOnline: true,
    catSlugs: ['tech'],
    cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
    priceCents: 0,
    timezone: 'UTC',
  })

  // Busy day with > 5 events
  for (let i = 0; i < 7; i++) {
    await createEvent({
      title: `Busy Day Session ${i + 1}`,
      slug: `busy-day-session-${i + 1}`,
      start: addHours(busyDay, 9 + i),
      venueId: i % 2 === 0 ? 'v_main' : 'v_hub',
      catSlugs: i % 3 === 0 ? ['tech'] : ['general'],
      status: i % 5 === 0 ? 'CANCELLED' : 'SCHEDULED',
      cover: `https://picsum.photos/seed/busy-${i}/600/320`,
      priceCents: i % 4 === 0 ? 0 : 1500,
    })
  }

  // Weekend events (Sat/Sun)
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const firstDayWeekday = firstDay.getUTCDay() // 0=Sun..6=Sat
  const firstSatOffset = (6 - firstDayWeekday + 7) % 7
  const firstSat = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1 + firstSatOffset))
  await createEvent({
    title: 'Weekend Market',
    slug: 'weekend-market',
    start: addHours(firstSat, 10),
    venueId: 'v_park',
    catSlugs: ['food'],
    cover: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1200&auto=format&fit=crop',
    timezone: 'UTC',
  })
  await createEvent({
    title: 'Sunday Run',
    slug: 'sunday-run',
    start: addHours(addHours(firstSat, 24), 9),
    venueId: 'v_park',
    catSlugs: ['sports'],
    cover: 'https://images.unsplash.com/photo-1543909365-9e2654dc314f?q=80&w=1200&auto=format&fit=crop',
    timezone: 'UTC',
  })

  // --- Finland (Loviisa region) venues ---
  await Promise.all([
    prisma.venue.upsert({
      where: { id: 'fi_loviisa_cityhall' },
      update: {},
      create: { id: 'fi_loviisa_cityhall', name: 'Loviisa City Hall', address: 'Raatihuoneentori 1', city: 'Loviisa', postalCode: '07900', country: 'FI', region: 'Uusimaa' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_stromfors_ironworks' },
      update: {},
      create: { id: 'fi_stromfors_ironworks', name: 'Strömfors Ironworks', address: 'Ruukintie 1', city: 'Loviisa', postalCode: '07970', country: 'FI', region: 'Uusimaa' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_valko_hall' },
      update: {},
      create: { id: 'fi_valko_hall', name: 'Valko Seaside Hall', address: 'Satamatie 5', city: 'Loviisa', postalCode: '07910', country: 'FI', region: 'Uusimaa' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_isnas_center' },
      update: {},
      create: { id: 'fi_isnas_center', name: 'Isnäs Community Center', address: 'Isnäsintie 10', city: 'Loviisa', postalCode: '07750', country: 'FI', region: 'Uusimaa' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_lapinjarvi_culture' },
      update: {},
      create: { id: 'fi_lapinjarvi_culture', name: 'Lapinjärvi Culture House', address: 'Viljamintie 15', city: 'Lapinjärvi', postalCode: '07800', country: 'FI', region: 'Uusimaa' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_porvoo_art_hall' },
      update: {},
      create: { id: 'fi_porvoo_art_hall', name: 'Porvoo Art Hall', address: 'Raatihuoneenkatu 13', city: 'Porvoo', postalCode: '06100', country: 'FI', region: 'Uusimaa' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_kotka_concert_hall' },
      update: {},
      create: { id: 'fi_kotka_concert_hall', name: 'Kotka Concert Hall', address: 'Keskuskatu 33', city: 'Kotka', postalCode: '48100', country: 'FI', region: 'Kymenlaakso' },
    }),
    prisma.venue.upsert({
      where: { id: 'fi_pyhtaa_nature' },
      update: {},
      create: { id: 'fi_pyhtaa_nature', name: 'Pyhtää Nature Center', address: 'Siltakyläntie 2', city: 'Pyhtää', postalCode: '49200', country: 'FI', region: 'Kymenlaakso' },
    }),
  ])

  const tzFI = 'Europe/Helsinki'
  const baseFI = new Date()
  baseFI.setHours(12, 0, 0, 0)

  // Seed ~16 regional events across the next 4 weeks in Finland (Loviisa & nearby)
  await createEvent({
    title: 'Theatre Night: Loviisa',
    slug: 'theatre-night-loviisa-wk1',
    start: addHours(addDays(baseFI, 3), 18 - 12),
    venueId: 'fi_loviisa_cityhall',
    catSlugs: ['theatre', 'theater-performances'],
    cover: null,
    timezone: tzFI,
  })
  await createEvent({
    title: 'Folk Music at Valko',
    slug: 'folk-music-valko-wk1',
    start: addHours(addDays(baseFI, 5), 19 - 12),
    venueId: 'fi_valko_hall',
    catSlugs: ['folk-music', 'music'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Art Exhibition: Porvoo',
    slug: 'art-exhibition-porvoo-wk2',
    start: addHours(addDays(baseFI, 9), 17 - 12),
    venueId: 'fi_porvoo_art_hall',
    catSlugs: ['art-exhibitions', 'art'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Weekend Food Market: Loviisa',
    slug: 'food-market-loviisa-wk2',
    start: addHours(addDays(baseFI, 12), 11 - 12),
    venueId: 'fi_loviisa_cityhall',
    catSlugs: ['food-markets', 'food'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Guided Nature Walk: Pyhtää',
    slug: 'nature-walk-pyhtaa-wk3',
    start: addHours(addDays(baseFI, 16), 10 - 12),
    venueId: 'fi_pyhtaa_nature',
    catSlugs: ['nature-walks'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Classical Concert: Kotka',
    slug: 'classical-concert-kotka-wk3',
    start: addHours(addDays(baseFI, 18), 19 - 12),
    venueId: 'fi_kotka_concert_hall',
    catSlugs: ['classical-concerts'],
    priceCents: 2500,
    timezone: tzFI,
  })
  await createEvent({
    title: 'Historical Tour: Strömfors',
    slug: 'historical-tour-stromfors-wk4',
    start: addHours(addDays(baseFI, 23), 14 - 12),
    venueId: 'fi_stromfors_ironworks',
    catSlugs: ['historical-tours', 'culture-heritage'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Kids Crafting: Lapinjärvi',
    slug: 'kids-crafting-lapinjarvi-wk4',
    start: addHours(addDays(baseFI, 24), 12 - 12),
    venueId: 'fi_lapinjarvi_culture',
    catSlugs: ['kids-crafting', 'family-nature'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Sauna Culture Evening: Isnäs',
    slug: 'sauna-evening-isnas-wk2',
    start: addHours(addDays(baseFI, 11), 18 - 12),
    venueId: 'fi_isnas_center',
    catSlugs: ['sauna-events', 'wellness-retreats'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Gardening Club: Lapinjärvi',
    slug: 'gardening-club-lapinjarvi-wk3',
    start: addHours(addDays(baseFI, 15), 17 - 12),
    venueId: 'fi_lapinjarvi_culture',
    catSlugs: ['gardening-permaculture'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Entrepreneur Meetup: Porvoo',
    slug: 'entrepreneur-meetup-porvoo-wk3',
    start: addHours(addDays(baseFI, 17), 18 - 12),
    venueId: 'fi_porvoo_art_hall',
    catSlugs: ['entrepreneur-meetups', 'workshops'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Workshop Day: Loviisa',
    slug: 'workshop-day-loviisa-wk4',
    start: addHours(addDays(baseFI, 25), 13 - 12),
    venueId: 'fi_loviisa_cityhall',
    catSlugs: ['workshops', 'craft-classes'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Dance Evening: Kotka',
    slug: 'dance-evening-kotka-wk2',
    start: addHours(addDays(baseFI, 13), 19 - 12),
    venueId: 'fi_kotka_concert_hall',
    catSlugs: ['dance-events'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Town Open Day: Loviisa',
    slug: 'town-open-day-loviisa-wk1',
    start: addHours(addDays(baseFI, 7), 11 - 12),
    venueId: 'fi_loviisa_cityhall',
    catSlugs: ['town-events-open-days', 'fairs-flea-markets'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Volunteer & Charity Fair: Loviisa',
    slug: 'volunteer-fair-loviisa-wk2',
    start: addHours(addDays(baseFI, 10), 12 - 12),
    venueId: 'fi_loviisa_cityhall',
    catSlugs: ['volunteer-charity'],
    timezone: tzFI,
  })
  await createEvent({
    title: 'Tech Night: Porvoo',
    slug: 'tech-night-porvoo-wk4',
    start: addHours(addDays(baseFI, 26), 18 - 12),
    venueId: 'fi_porvoo_art_hall',
    catSlugs: ['tech-events', 'tech'],
    timezone: tzFI,
  })

  console.log('Seed completed with rich dataset')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
