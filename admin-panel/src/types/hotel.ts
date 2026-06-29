export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked'
export type CleaningStatus = 'clean' | 'dirty' | 'in_progress' | 'inspected'
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
