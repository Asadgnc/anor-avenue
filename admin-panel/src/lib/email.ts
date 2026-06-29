export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // RESEND_API_KEY ayarlanmamışsa email gönderilmez

  const from = process.env.EMAIL_FROM ?? 'Anor Avenue Hotel <onboarding@resend.dev>'

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
  } catch {
    // Email hatası rezervasyonu engellememeli
  }
}

export function newBookingAdminEmail(data: {
  guestName: string
  phone: string
  email: string | null
  roomType: string
  checkIn: string
  checkOut: string
  nights: number
  total: number
  code: string
}): string {
  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0F0F1A;color:#E8E8F0;padding:32px;border-radius:12px">
    <h1 style="color:#C9A96E;font-size:20px;margin-bottom:4px">Yeni Rezervasyon</h1>
    <p style="color:#888;font-size:14px;margin-bottom:24px">Misafir sitesinden yeni bir talep geldi</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">Misafir</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.guestName}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">Telefon</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.phone}</td></tr>
      ${data.email ? `<tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">E-posta</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.email}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">Oda Tipi</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.roomType}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">Giriş</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.checkIn}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">Çıkış</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.checkOut}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">Gece</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.nights}</td></tr>
      <tr><td style="padding:8px 0;color:#888">Toplam</td><td style="padding:8px 0;text-align:right;color:#C9A96E;font-weight:700">${new Intl.NumberFormat('uz-UZ').format(data.total)} UZS</td></tr>
    </table>

    <div style="margin-top:24px;padding:16px;background:#1E1E3A;border-radius:8px;text-align:center">
      <p style="color:#888;font-size:12px;margin:0 0 4px">Rezervasyon Kodu</p>
      <p style="color:#C9A96E;font-size:22px;font-weight:800;font-family:monospace;margin:0">${data.code}</p>
    </div>

    <p style="margin-top:24px;font-size:12px;color:#555;text-align:center">Anor Avenue Hotel · Admin Panel</p>
  </div>`
}

export function bookingConfirmGuestEmail(data: {
  guestName: string
  roomType: string
  checkIn: string
  checkOut: string
  nights: number
  total: number
  code: string
  locale: string
}): { subject: string; html: string } {
  const isUz = data.locale === 'uz'
  const isRu = data.locale === 'ru'

  const subject = isUz
    ? `Buyurtma tasdiqlandi — ${data.code}`
    : isRu
    ? `Бронирование подтверждено — ${data.code}`
    : `Booking Confirmed — ${data.code}`

  const title = isUz ? 'Buyurtmangiz qabul qilindi' : isRu ? 'Бронирование принято' : 'Booking Received'
  const sub = isUz
    ? 'Tez orada siz bilan bog\'lanamiz'
    : isRu ? 'Мы свяжемся с вами в ближайшее время'
    : 'We will get back to you shortly'
  const lblGuest = isUz ? 'Mehmon' : isRu ? 'Гость' : 'Guest'
  const lblRoom  = isUz ? 'Xona turi' : isRu ? 'Тип номера' : 'Room Type'
  const lblIn    = isUz ? 'Kelish' : isRu ? 'Заезд' : 'Check-in'
  const lblOut   = isUz ? 'Ketish' : isRu ? 'Выезд' : 'Check-out'
  const lblNight = isUz ? 'Kecha' : isRu ? 'Ночей' : 'Nights'
  const lblTotal = isUz ? 'Jami' : isRu ? 'Итого' : 'Total'
  const lblCode  = isUz ? 'Buyurtma kodi' : isRu ? 'Код бронирования' : 'Booking Code'

  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0F0F1A;color:#E8E8F0;padding:32px;border-radius:12px">
    <h1 style="color:#C9A96E;font-size:20px;margin-bottom:4px">${title}</h1>
    <p style="color:#888;font-size:14px;margin-bottom:24px">${sub}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lblGuest}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.guestName}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lblRoom}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.roomType}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lblIn}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.checkIn}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lblOut}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.checkOut}</td></tr>
      <tr><td style="padding:8px 0;color:#888;border-bottom:1px solid #1E1E3A">${lblNight}</td><td style="padding:8px 0;border-bottom:1px solid #1E1E3A;text-align:right">${data.nights}</td></tr>
      <tr><td style="padding:8px 0;color:#888">${lblTotal}</td><td style="padding:8px 0;text-align:right;color:#C9A96E;font-weight:700">${new Intl.NumberFormat('uz-UZ').format(data.total)} UZS</td></tr>
    </table>

    <div style="margin-top:24px;padding:16px;background:#1E1E3A;border-radius:8px;text-align:center">
      <p style="color:#888;font-size:12px;margin:0 0 4px">${lblCode}</p>
      <p style="color:#C9A96E;font-size:22px;font-weight:800;font-family:monospace;margin:0">${data.code}</p>
    </div>

    <p style="margin-top:24px;font-size:12px;color:#555;text-align:center">Anor Avenue Hotel · Toshkent</p>
  </div>`

  return { subject, html }
}
