import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package } from 'lucide-react'
import GardenClient from './GardenClient'
import DepoClient from '@/app/[locale]/(dashboard)/depo/DepoClient'
import type { GardenTask, InventoryPurchase } from '@/types/hotel'

export default async function GardenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tasksResult, purchasesResult, profilesResult] = await Promise.all([
    supabase
      .from('garden_tasks')
      .select('id, title, note, status, created_by, done_at, created_at, profiles(full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('inventory_purchases')
      .select('id, category, area, product_name, quantity, unit_price, total_amount, currency, place, entered_by, brought_by_name, created_at, profiles(full_name)')
      .eq('area', 'garden')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  const tasks = (tasksResult.data ?? []) as unknown as GardenTask[]
  const purchases = (purchasesResult.data ?? []) as unknown as InventoryPurchase[]
  const profiles = (profilesResult.data ?? []) as Array<{ id: string; full_name: string }>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bahçe İşleri</h1>
        <p className="text-sm text-muted-foreground mt-1">Görev listesi ve bahçe malzemeleri</p>
      </div>

      {/* Görevler */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Görevler</h2>
        <GardenClient tasks={tasks} />
      </section>

      {/* Malzemeler */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Package size={14} /> Bahçe Malzemeleri ({purchases.length})
          </h2>
          <Link
            href="/depo?area=garden"
            className="text-xs text-primary hover:underline"
          >
            Depoda görüntüle →
          </Link>
        </div>
        <DepoClient purchases={purchases} profiles={profiles} areaFilter="garden" />
      </section>
    </div>
  )
}
