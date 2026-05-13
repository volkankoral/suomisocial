import { notFound } from 'next/navigation'
import { hasLocale } from '@/dictionaries'
import { LandingPage } from './_components/LandingPage'
import { createServiceClient } from '@/lib/supabase/service'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const supabase = createServiceClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, price_monthly, price_yearly, features, is_featured, stripe_price_id_monthly, stripe_price_id_yearly')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  return <LandingPage lang={lang} plans={plans ?? []} />
}
