export function toDisplayLocaleTag(locale: string): string {
  switch (locale) {
    case 'sv':
      return 'sv-SE'
    case 'fi':
      return 'fi-FI'
    default:
      return 'en-GB'
  }
}
