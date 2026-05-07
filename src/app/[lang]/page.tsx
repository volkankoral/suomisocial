import { notFound } from 'next/navigation'
import { hasLocale } from '@/dictionaries'
import { LandingPage } from './_components/LandingPage'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  return <LandingPage lang={lang} />
}
