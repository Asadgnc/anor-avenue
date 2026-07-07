// ─────────────────────────────────────────────────────────────────────────────
// MIRRORED FILE — admin-panel/src/lib/availability.ts and
// guest-site/src/lib/availability.ts must stay BYTE-IDENTICAL.
// Edit both copies together and run: node scripts/check-availability-parity.mjs
// (the two apps deploy separately on Vercel, so a shared package is not used).
//
// Smart availability + room-combination engine (server-safe, pure logic).
// Given dates + party size it ranks ALL valid room combinations by real
// date-based availability, cheapest total first.
//
// Price source: the `rooms_with_effective_price` view
// (COALESCE(price_override, base_price)) — NEVER raw base_price.
// Capacity source: `channex_variants.occupancy` (via rooms.channex_variant_id),
// falling back to room_types.max_occupancy. This touches neither the SECURITY
// DEFINER price view nor any new view.
//
// `computeOffers` is pure and DB-free → easy to unit-test.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

export type RoomState = 'FREE' | 'BLOCKED' | 'UNCERTAIN'

export type TypeSlug = 'standard' | 'deluxe' | 'luxury'

export interface BookableRoom {
  id: string
  roomNumber: string
  floor: number
  typeName: string
  typeSlug: TypeSlug
  capacity: number
  pricePerNight: number
  hasJacuzzi: boolean
  hasBathtub: boolean
  isIsolated: boolean
  viewQuality: 'standard' | 'good' | 'premium'
  connecting: boolean
  state: RoomState
}

export interface Offer {
  rooms: BookableRoom[]
  roomCount: number
  totalCapacity: number
  perNightPrice: number
  totalPrice: number // whole stay (perNight * nights)
  waste: number // totalCapacity - partySize
  exactFit: boolean
}

export interface AvailabilityResult {
  nights: number
  partySize: number
  status: 'ok' | 'insufficient'
  offers: Offer[]
  freeCapacity: number // combined capacity of FREE rooms
  totalCapacity: number // combined capacity of all active rooms
  partial: Offer | null // when status='insufficient': the largest hostable set
}

const TYPE_SLUG_MAP: Record<string, TypeSlug> = {
  Standard: 'standard',
  Deluxe: 'deluxe',
  Luxury: 'luxury',
}

// How many offers to show (after sorting)
const MAX_OFFERS = 8

// ─── Narrow DB row types ─────────────────────────────────────────────────────

interface PriceRow {
  id: string
  room_number: string
  floor: number
  room_type_name: string
  effective_price: number | string
  has_jacuzzi: boolean
  has_bathtub: boolean
  is_isolated: boolean
  view_quality: 'standard' | 'good' | 'premium'
  connecting_room_id: string | null
}

interface CapacityRow {
  id: string
  room_types: { max_occupancy: number | null } | null
  channex_variants: { occupancy: number | null } | null
}

/**
 * Returns the id → capacity map for active rooms. Capacity comes from the
 * channex variant first (real physical capacity), else from the room type.
 */
export async function fetchRoomCapacities(
  client: SupabaseClient
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const { data, error } = await client
    .from('rooms')
    .select('id, room_types(max_occupancy), channex_variants(occupancy)')
    .eq('is_active', true)

  if (error || !data) return map
  for (const raw of data as unknown as CapacityRow[]) {
    const cap = raw.channex_variants?.occupancy ?? raw.room_types?.max_occupancy ?? 2
    map.set(raw.id, cap)
  }
  return map
}

/**
 * Loads all active rooms for the given dates with capacity + state
 * (FREE/BLOCKED). Conflict test uses the half-open interval:
 * res.check_in < checkOut && res.check_out > checkIn (a room's checkout day
 * equals the new check-in day WITHOUT conflicting).
 */
export async function loadBookableRooms(
  client: SupabaseClient,
  checkIn: string,
  checkOut: string
): Promise<BookableRoom[]> {
  const [{ data: priceData }, capacities] = await Promise.all([
    client
      .from('rooms_with_effective_price')
      .select(
        'id, room_number, floor, room_type_name, effective_price, has_jacuzzi, has_bathtub, is_isolated, view_quality, connecting_room_id, is_active'
      )
      .eq('is_active', true),
    fetchRoomCapacities(client),
  ])

  const priceRows = (priceData ?? []) as unknown as PriceRow[]
  if (priceRows.length === 0) return []

  const roomIds = priceRows.map((r) => r.id)

  const { data: conflicts } = await client
    .from('reservations')
    .select('room_id')
    .in('room_id', roomIds)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  const blocked = new Set((conflicts ?? []).map((c) => c.room_id as string))

  // UNCERTAIN: rooms freeing up on the turnover day (checkout == requested
  // check-in) whose guest is flagged "may extend" → risky, never offered.
  const uncertain = new Set<string>()
  const { data: extRows, error: extErr } = await client
    .from('reservations')
    .select('room_id')
    .in('room_id', roomIds)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .eq('check_out', checkIn)
    .eq('may_extend', true)
  if (!extErr && extRows) {
    for (const c of extRows) uncertain.add(c.room_id as string)
  }

  return priceRows.map((r) => ({
    id: r.id,
    roomNumber: r.room_number,
    floor: r.floor,
    typeName: r.room_type_name,
    typeSlug: TYPE_SLUG_MAP[r.room_type_name] ?? 'luxury',
    capacity: capacities.get(r.id) ?? 2,
    pricePerNight: Number(r.effective_price),
    hasJacuzzi: r.has_jacuzzi,
    hasBathtub: r.has_bathtub,
    isIsolated: r.is_isolated,
    viewQuality: r.view_quality,
    connecting: r.connecting_room_id != null,
    state: blocked.has(r.id) ? 'BLOCKED' : uncertain.has(r.id) ? 'UNCERTAIN' : 'FREE',
  }))
}

// ─── Pure combination logic (DB-free, testable) ──────────────────────────────

function makeOffer(rooms: BookableRoom[], partySize: number, nights: number): Offer {
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0)
  const perNightPrice = rooms.reduce((s, r) => s + r.pricePerNight, 0)
  return {
    rooms,
    roomCount: rooms.length,
    totalCapacity,
    perNightPrice,
    totalPrice: perNightPrice * nights,
    waste: totalCapacity - partySize,
    exactFit: totalCapacity === partySize,
  }
}

/** Signature distinguishing offers of the same "shape" (type + price multiset). */
function offerSignature(offer: Offer): string {
  return offer.rooms
    .map((r) => `${r.typeSlug}:${r.capacity}:${r.pricePerNight}`)
    .sort()
    .join('|')
}

/**
 * From FREE rooms, builds the MINIMAL combinations covering partySize
 * (removing any room must drop capacity below partySize → no waste), sorts
 * cheapest total first, dedupes similar shapes and returns the first
 * MAX_OFFERS.
 *
 * For ≤12 rooms it scans 2^12 = 4096 subsets → milliseconds.
 */
export function computeOffers(
  rooms: BookableRoom[],
  partySize: number,
  nights: number
): Offer[] {
  const free = rooms.filter((r) => r.state === 'FREE')
  const n = free.length
  if (n === 0 || partySize < 1) return []

  const minimalCovers: Offer[] = []

  for (let mask = 1; mask < 1 << n; mask++) {
    const subset: BookableRoom[] = []
    let cap = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(free[i])
        cap += free[i].capacity
      }
    }
    if (cap < partySize) continue

    // Minimality: removing any single room must drop capacity below the threshold
    let minimal = true
    for (const r of subset) {
      if (cap - r.capacity >= partySize) {
        minimal = false
        break
      }
    }
    if (!minimal) continue

    minimalCovers.push(makeOffer(subset, partySize, nights))
  }

  // Sort: cheapest total → fewer rooms → less waste
  minimalCovers.sort(
    (a, b) =>
      a.totalPrice - b.totalPrice ||
      a.roomCount - b.roomCount ||
      a.waste - b.waste
  )

  // Keep the cheapest of similarly shaped offers
  const seen = new Set<string>()
  const unique: Offer[] = []
  for (const offer of minimalCovers) {
    const sig = offerSignature(offer)
    if (seen.has(sig)) continue
    seen.add(sig)
    unique.push(offer)
    if (unique.length >= MAX_OFFERS) break
  }

  return unique
}

/** When status='insufficient': all FREE rooms cheapest-first (max hosting). */
function buildPartial(rooms: BookableRoom[], partySize: number, nights: number): Offer | null {
  const free = rooms
    .filter((r) => r.state === 'FREE')
    .sort((a, b) => a.pricePerNight - b.pricePerNight)
  if (free.length === 0) return null
  return makeOffer(free, partySize, nights)
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  )
}

export async function findAvailability(
  client: SupabaseClient,
  input: { checkIn: string; checkOut: string; partySize: number }
): Promise<AvailabilityResult> {
  const nights = Math.max(1, nightsBetween(input.checkIn, input.checkOut))
  const rooms = await loadBookableRooms(client, input.checkIn, input.checkOut)

  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0)
  const freeCapacity = rooms
    .filter((r) => r.state === 'FREE')
    .reduce((s, r) => s + r.capacity, 0)

  if (freeCapacity < input.partySize) {
    return {
      nights,
      partySize: input.partySize,
      status: 'insufficient',
      offers: [],
      freeCapacity,
      totalCapacity,
      partial: buildPartial(rooms, input.partySize, nights),
    }
  }

  return {
    nights,
    partySize: input.partySize,
    status: 'ok',
    offers: computeOffers(rooms, input.partySize, nights),
    freeCapacity,
    totalCapacity,
    partial: null,
  }
}
