import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DepoClient from './DepoClient'
import DepoProductsSection from './DepoProductsSection'
import type { InventoryPurchase, InventoryProduct } from '@/types/hotel'

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

  // Stok ürünleri — herkese görünür
  const productsQuery = supabase
    .from('inventory_products')
    .select('id, name, category, on_hand, created_at')
    .order('category')
    .order('name')

  // Odalar — tüketim formu için (aktif odalar)
  const roomsQuery = supabase
    .from('rooms')
    .select('id, room_number')
    .eq('is_active', true)
    .order('room_number')

  // Satın alım geçmişi + profil listesi — temizlikçiye gösterilmez
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

  const [productsResult, roomsResult, purchasesResult, profilesResult] = await Promise.all([
    productsQuery,
    roomsQuery,
    purchasesQuery ?? Promise.resolve({ data: null, error: null }),
    profilesQuery ?? Promise.resolve({ data: null, error: null }),
  ])

  const products = (productsResult.data ?? []) as InventoryProduct[]
  const rooms    = (roomsResult.data ?? []) as Array<{ id: string; room_number: string }>
  const purchases = (purchasesResult.data ?? []) as unknown as InventoryPurchase[]
  const profiles  = (profilesResult.data ?? []) as Array<{ id: string; full_name: string }>

  const areaLabel = area === 'rooms' ? 'Odalar' : area === 'garden' ? 'Bahçe' : undefined

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Depo{areaLabel ? ` — ${areaLabel}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {products.length} çeşit ürün · stok takibi
        </p>
      </div>

      {/* Ürünler Bölümü */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Ürünler
        </h2>
        <DepoProductsSection
          products={products}
          rooms={rooms}
          isAdmin={isAdmin}
        />
      </div>

      {/* Alımlar Bölümü — sadece admin/manager/receptionist */}
      {!isHousekeeper && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Alım Geçmişi
            </h2>
            <span className="text-xs text-muted-foreground">{purchases.length} kayıt{area ? ` (${areaLabel})` : ''}</span>
          </div>
          <DepoClient purchases={purchases} profiles={profiles} areaFilter={area} />
        </div>
      )}
    </div>
  )
}
