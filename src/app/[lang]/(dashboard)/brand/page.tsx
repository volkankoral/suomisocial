import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { BrandForm } from './_components/BrandForm'
import { Animate } from '@/components/ui/animate'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function BrandPage({ params }: Props) {
  await params
  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  const { data: brand } = orgId
    ? await supabase
        .from('brand_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single()
    : { data: null }

  return (
    <div className="space-y-8">
      <Animate>
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Marka Ayarları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI içerik üretiminde kullanılacak işletme bilgilerini buradan düzenle
          </p>
        </div>
      </Animate>

      <Animate delay={0.08}>
        {orgId ? (
          <BrandForm orgId={orgId} brand={brand} />
        ) : (
          <div className="rounded-xl border border-white/8 bg-card p-8 text-center">
            <p className="text-muted-foreground text-sm">Organizasyon bulunamadı.</p>
          </div>
        )}
      </Animate>
    </div>
  )
}
