import Footer from '@/components/Footer'
import Providers from '@/components/Providers'
import MobileNav from '@/components/MobileNav'

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'sv'}, {locale: 'fi'}]
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{locale: 'en' | 'sv' | 'fi'}>
}) {
  const { locale } = await params
  // We no longer use next-intl provider to avoid requiring a global config.
  // Pages import their own messages directly based on `locale`.
  return (
    <Providers>
      {children}
      <Footer locale={locale} />
      {/* Mobile bottom navigation */}
      <MobileNav locale={locale} />
    </Providers>
  )
}
