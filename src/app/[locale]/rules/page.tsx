export default async function RulesPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }> }) {
  const { locale } = await params
  const messages = (await import(`@/messages/${locale}.json`)).default as any
  const t = (key: keyof typeof messages.Rules) => messages.Rules[key]

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-gray-700">{t('intro')}</p>

        <ol className="list-decimal ml-6 space-y-2 text-gray-800">
          <li>{t('rule1')}</li>
          <li>{t('rule2')}</li>
          <li>{t('rule3')}</li>
        </ol>

        <p className="text-sm text-gray-500">{t('note')}</p>
      </div>
    </div>
  )
}
