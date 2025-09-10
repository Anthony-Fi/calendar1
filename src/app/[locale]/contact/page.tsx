export default async function ContactPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }> }) {
  const { locale } = await params
  const messages = (await import(`@/messages/${locale}.json`)).default as any
  const t = (key: keyof typeof messages.Contact) => messages.Contact[key]

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-gray-700">{t('intro')}</p>

        <div className="space-y-2">
          <div><strong>{t('email')}:</strong> contact@example.com</div>
          <div><strong>{t('support')}:</strong> support@example.com</div>
        </div>

        <p className="text-sm text-gray-500">{t('note')}</p>
      </div>
    </div>
  )
}
