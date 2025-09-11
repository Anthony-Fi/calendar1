export type Locale = 'sv' | 'fi' | 'en'

export function fallbackOrder(requested?: Locale | string | null): Locale[] {
  const base: Locale[] = ['sv', 'fi', 'en']
  const req = (requested as Locale) || null
  const ordered = req ? ([req, ...base] as Locale[]) : base
  return ordered.filter((v, i) => ordered.indexOf(v) === i) as Locale[]
}

export function pickEventTranslation(
  event: { title?: string | null; description?: string | null; translations?: Array<{ locale: string; title: string; description?: string | null }> },
  requested?: Locale | string | null
): { title?: string | null; description?: string | null } {
  const trans = event.translations || []
  const order = fallbackOrder(requested)
  for (const loc of order) {
    const t = trans.find((x) => x.locale === loc)
    if (t) return { title: t.title ?? event.title ?? null, description: t.description ?? event.description ?? null }
  }
  return { title: event.title ?? null, description: event.description ?? null }
}
