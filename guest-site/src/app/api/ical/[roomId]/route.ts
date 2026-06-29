import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// iCal feed for a single room — channel managers (Nobeds etc.) subscribe to this URL.
// URL: /api/ical/{roomId}?token={ICAL_SECRET}
// The token prevents random scraping. Set ICAL_SECRET env var.

type Params = { params: Promise<{ roomId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { roomId } = await params

  // Simple token auth — not perfect but sufficient for channel manager use
  const secret = process.env.ICAL_SECRET
  if (secret) {
    const token = req.nextUrl.searchParams.get('token')
    if (token !== secret) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  const service = createServiceClient()

  // Verify room exists
  const { data: room, error: roomErr } = await service
    .from('rooms')
    .select('id, room_number')
    .eq('id', roomId)
    .single()

  if (roomErr || !room) {
    return new NextResponse('Room not found', { status: 404 })
  }

  // Fetch active reservations for this room (not cancelled/no-show)
  const { data: reservations, error: resErr } = await service
    .from('reservations')
    .select('reservation_code, check_in, check_out, guests(first_name, last_name), status, created_at')
    .eq('room_id', roomId)
    .in('status', ['pending', 'confirmed', 'checked_in', 'checked_out'])
    .order('check_in', { ascending: true })

  if (resErr) {
    return new NextResponse('Server error', { status: 500 })
  }

  const now = formatIcalDate(new Date())
  const hotelName = 'Anor Avenue Hotel'
  const lines: string[] = []

  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Anor Avenue Hotel//Reservation Calendar//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-CALNAME:${hotelName} - Room ${room.room_number}`)
  lines.push('X-WR-TIMEZONE:Asia/Tashkent')
  lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H')

  for (const res of reservations ?? []) {
    const guest = res.guests as unknown as { first_name: string; last_name: string } | null
    const guestName = guest ? `${guest.first_name} ${guest.last_name}` : 'Guest'
    const createdAt = res.created_at ? formatIcalDate(new Date(res.created_at)) : now

    lines.push('BEGIN:VEVENT')
    // UID must be globally unique and stable
    lines.push(`UID:${res.reservation_code}@anor-avenue.hotel`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`CREATED:${createdAt}`)
    // iCal uses DATE (not DATETIME) for all-day events (check-in/out style)
    lines.push(`DTSTART;VALUE=DATE:${res.check_in.replace(/-/g, '')}`)
    lines.push(`DTEND;VALUE=DATE:${res.check_out.replace(/-/g, '')}`)
    lines.push(`SUMMARY:${guestName} [${res.reservation_code}]`)
    lines.push(`STATUS:${icalStatus(res.status)}`)
    lines.push(`DESCRIPTION:Booking ${res.reservation_code} · Status: ${res.status}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // iCal files must use CRLF line endings (RFC 5545)
  const icsContent = lines.join('\r\n')

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="room-${room.room_number}.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function icalStatus(status: string): string {
  switch (status) {
    case 'cancelled':
      return 'CANCELLED'
    case 'pending':
      return 'TENTATIVE'
    default:
      return 'CONFIRMED'
  }
}
