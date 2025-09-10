import LoginForm from '@/components/LoginForm'
import RequestAccessForm from '@/components/RequestAccessForm'
import PasswordlessLoginForm from '@/components/PasswordlessLoginForm'

export default async function LoginPage({ params }: { params: Promise<{ locale: 'en' | 'sv' | 'fi' }> }) {
  const { locale } = await params
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || ''
  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
        <LoginForm locale={locale} />
        <div className="my-8 h-px bg-gray-200" />
        <h2 className="text-lg font-semibold mb-3">Passwordless login</h2>
        <PasswordlessLoginForm locale={locale} siteKey={turnstileSiteKey} />
        <div className="my-8 h-px bg-gray-200" />
        <h2 className="text-lg font-semibold mb-3">Request access</h2>
        <RequestAccessForm locale={locale} siteKey={turnstileSiteKey} />
      </div>
    </div>
  )
}
