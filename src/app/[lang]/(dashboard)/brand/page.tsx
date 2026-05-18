import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { getSupportedCountries } from '@/lib/calendar'
import { BrandForm } from './_components/BrandForm'
import { Animate } from '@/components/ui/animate'
import { translations, type Lang } from '@/lib/translations'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function BrandPage({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t = translations[lang]

  const supabase    = createServiceClient()
  const orgId       = await getUserOrgId()
  const countryCode = await getUserOrgCountry()
  const countries   = getSupportedCountries()

  const { data: brand } = orgId
    ? await supabase.from('brand_settings').select('*').eq('organization_id', orgId).single()
    : { data: null }

  return (
    <div className="space-y-8">
      <Animate>
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">{t.brand.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.brand.subtitle}</p>
        </div>
      </Animate>

      <Animate delay={0.08}>
        {orgId ? (
          <BrandForm orgId={orgId} brand={brand} countryCode={countryCode} countries={countries} />
        ) : (
          <div className="rounded-xl border border-white/8 bg-card p-8 text-center">
            <p className="text-muted-foreground text-sm">{t.brand.noOrg}</p>
          </div>
        )}
      </Animate>
    </div>
  )
}
