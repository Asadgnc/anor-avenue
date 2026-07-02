export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked'
export type CleaningStatus = 'clean' | 'dirty' | 'in_progress' | 'cleaned' | 'inspected'
export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
export type Channel = 'direct' | 'booking_com' | 'agoda' | 'walk_in' | 'phone'
export type PaymentMethod = 'payme' | 'click' | 'uzum' | 'cash' | 'transfer'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface RoomType {
  id: string
  name: string
  description: string | null
  base_price: number
  max_occupancy: number
}

export interface Room {
  id: string
  room_number: string
  floor: number
  status: RoomStatus
  cleaning_status: CleaningStatus
  is_active: boolean
  notes: string | null
  room_type_id: string
  room_types: Pick<RoomType, 'name' | 'base_price'> | null
}

export interface Guest {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  passport_number: string | null
}

export interface Reservation {
  id: string
  reservation_code: string
  room_id: string
  guest_id: string
  channel: Channel
  status: ReservationStatus
  check_in: string   // YYYY-MM-DD
  check_out: string  // YYYY-MM-DD
  adults: number
  children: number
  nights: number
  room_rate: number
  total_amount: number
  discount: number
  currency: string
  special_requests: string | null
  notes: string | null
  guests: Pick<Guest, 'first_name' | 'last_name'> | null
}

export interface Payment {
  id: string
  reservation_id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paid_at: string | null
  notes: string | null
  created_at: string
}

export interface RoomItem {
  id: string
  room_id: string
  name: string
  expected_qty: number
  sort_order: number
  created_at: string
}

export interface RoomInspection {
  id: string
  room_id: string
  reservation_id: string | null
  inspected_by: string | null
  all_ok: boolean
  problem_note: string | null
  damage_ok: boolean
  damage_note: string | null
  missing_items: Array<{ item_id: string; name: string; note?: string }>
  created_at: string
  profiles?: { full_name: string } | null
}

export interface InventoryPurchase {
  id: string
  category: 'cleaning' | 'kitchen' | 'food' | 'beverage' | 'decoration' | 'room_furniture' | 'replacement'
  area: 'general' | 'rooms' | 'garden'
  product_name: string
  quantity: number
  unit_price: number | null
  total_amount: number
  currency: 'UZS' | 'USD'
  place: string
  entered_by: string | null
  brought_by_name: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

export interface GardenTask {
  id: string
  title: string
  note: string | null
  status: 'pending' | 'done'
  created_by: string | null
  done_at: string | null
  created_at: string
  profiles?: { full_name: string } | null
}
