import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import DepoClient from './DepoClient'
import DepoProductsSection from './DepoProductsSection'
import GardenClient from '@/app/[locale]/(dashboard)/garden/GardenClient'
import type { InventoryPurchase, InventoryProduct, GardenTask } from '@/types/hotel'

const AREA_KEYS = ['general', 'rooms', 'garden', 'kitchen', 'reception'] as const

export default async function DepoPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.user_metadata?.role as string | undefined) ?? 'receptionist'
  const isHousekeeper = role === 'housekeeper'
  const isAdmin = role === 'admin'

  const { area } = await searchParams

  // Stock products — visible to everyone
  const productsQuery = supabase
    .from('inventory_products')
    .select('id, name, category, on_hand, created_at')
    .order('category')
    .order('name')

  // Rooms — for the consume form (active rooms)
  const roomsQuery = supabase
    .from('rooms')
    .select('id, room_number')
    .eq('is_active', true)
    .order('room_number')

  // Purchase history + profile list — not shown to housekeepers
  const purchasesQuery = isHousekeeper
    ? null
    : (area
        ? supabase
            .from('inventory_purchases')
            .select('id, category, area, product_name, quantity, unit_price, total_amount, currency, place, entered_by, brought_by_name, created_at, profiles(full_name)')
            .eq('area', area)
            .order('created_at', { ascending: false })
        : supabase
            .from('inventory_purchases')
            .select('id, category, area, product_name, quantity, unit_price, total_amount, currency, place, entered_by, brought_by_name, created_at, profiles(full_name)')
            .order('created_at', { ascending: false }))

  const profilesQuery = isHousekeeper
    ? null
    : supabase.from('profiles').select('id, full_name').order('full_name')

  // Garden tasks — only when viewing the garden area (folded in from the old /garden page)
  const gardenTasksQuery = area === 'garden'
    ? supabase
        .from('garden_tasks')
        .select('id, title, note, status, created_by, done_at, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
    : null

  const [productsResult, roomsResult, purchasesResult, profilesResult, gardenTasksResult] = await Promise.all([
    productsQuery,
    roomsQuery,
    purchasesQuery ?? Promise.resolve({ data: null, error: null }),
    profilesQuery ?? Promise.resolve({ data: null, error: null }),
    gardenTasksQuery ?? Promise.resolve({ data: null, error: null }),
  ])

  const products = (productsResult.data ?? []) as InventoryProduct[]
  const rooms    = (roomsResult.data ?? []) as Array<{ id: string; room_number: string }>
  const purchases = (purchasesResult.data ?? []) as unknown as InventoryPurchase[]
  const profiles  = (profilesResult.data ?? []) as Array<{ id: string; full_name: string }>
  const gardenTasks = (gardenTasksResult.data ?? []) as unknown as GardenTask[]

  const t = await getTranslations('depo')
  const tArea = await getTranslations('depo.areas')
  const tCommon = await getTranslations('common')
  const tGarden = await getTranslations('garden')
  const areaLabel = area && tArea.has(area) ? tArea(area) : undefined

  const chipStyle = (activeChip: boolean) =>
    activeChip
      ? { backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }
      : { backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', boxShadow: 'var(--shadow-card)' }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t('pageTitle')}{areaLabel ? ` — ${areaLabel}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('productCountSubtitle', { n: products.length })}
        </p>
      </div>

      {/* Area filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/depo" className="text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80" style={chipStyle(!area)}>
          {tCommon('all')}
        </Link>
        {AREA_KEYS.map((a) => (
          <Link key={a} href={`/depo?area=${a}`} className="text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-80" style={chipStyle(area === a)}>
            {tArea(a)}
          </Link>
        ))}
      </div>

      {/* Garden tasks — folded in from the old /garden page (only in garden area) */}
      {area === 'garden' && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {tGarden('tasksSection')}
          </h2>
          <GardenClient tasks={gardenTasks} />
        </div>
      )}

      {/* Products section */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t('productsTitle')}
        </h2>
        <DepoProductsSection
          products={products}
          rooms={rooms}
          isAdmin={isAdmin}
        />
      </div>

      {/* Purchases section — admin/manager/receptionist only */}
      {!isHousekeeper && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {t('purchaseHistoryTitle')}
            </h2>
            <span className="text-xs text-muted-foreground">
              {area && areaLabel
                ? t('recordCountWithArea', { n: purchases.length, area: areaLabel })
                : t('recordCount', { n: purchases.length })}
            </span>
          </div>
          <DepoClient purchases={purchases} profiles={profiles} areaFilter={area} />
        </div>
      )}
    </div>
  )
}
