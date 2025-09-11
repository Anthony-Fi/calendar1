import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Loviisa Online',
  description: 'Discover upcoming events in Loviisa and nearby.',
}

export default function Home() {
  redirect('/en')
}
