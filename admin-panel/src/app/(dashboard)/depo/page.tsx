import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DepoClient from './DepoClient'
import type { InventoryPurchase } from '@/types/hotel'

export default async function DepoPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { area } = await searchParams

  const [purchasesResult, profilesResult] = await Promise.all([
    area
      ? supabase
          .from('inventory_purchases')
          .select('id, category, area, product_name, quantity, unit_price, total_amount, currency, place, entered_by, brought_by_name, created_at, profiles(full_name)')
          .eq('area', area)
          .order('created_at', { ascending: false })
      : supabase
          .from('inventory_purchases')
          .select('id, category, area, product_name, quantity, unit_price, total_amount, currency, place, entered_by, brought_by_name, created_at, profiles(full_name)')
          .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  const purchases = (purchasesResult.data ?? []) as unknown as InventoryPurchase[]
  const profiles = (profilesResult.data ?? []) as Array<{ id: string; full_name: string }>

  const areaLabel = area === 'rooms' ? 'Odalar' : area === 'garden' ? 'Bahçe' : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Depo{areaLabel ? ` — ${areaLabel}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {purchases.length} alım kaydı{area ? ` (${areaLabel} alanı)` : ''}
        </p>
      </div>

      <DepoClient purchases={purchases} profiles={profiles} areaFilter={area} />
    </div>
  )
}
