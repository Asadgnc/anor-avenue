# HANDOFF — Anor Avenue Hotel — Claude Code Talimatları

CLAUDE.md ve docs/tasks.md'yi oku. Bu dosya onların üzerine eklenmiş güncel durum özetidir.

---

## Nerede kaldık

Dashboard sayfası yazıldı ve TypeScript hatasız derleniyor.
Middleware çalışıyor — oturum yoksa /login'e yönlendiriyor (doğru davranış).
Supabase bağlantısı henüz test edilmedi çünkü .env.local eksik olabilir.

### Tamamlananlar (tasks.md'de işaretli olmayanlar dahil)
- [x] admin-panel scaffold + auth middleware
- [x] Login sayfası
- [x] Dashboard sayfası (Promise.all, 10 paralel sorgu, hata toleranslı)
- [x] Design tokens (admin panel koyu tema)
- [x] lucide-react yüklendi

### Hâlâ eksik (tasks.md Faz 1)
- [ ] admin-panel/.env.local — NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekli olmalı
- [ ] schema.sql Supabase'de çalıştırıldı mı? Tablolar var mı?
- [ ] Supabase tipleri üretildi mi? (pnpm supabase gen types typescript --local > src/types/supabase.ts)
- [ ] Font'lar (next/font) eklendi mi?

---

## Sıradaki adımlar — sırayla yap

### Adım 1 — .env.local kontrolü
admin-panel/.env.local dosyasını kontrol et.
Yoksa oluştur:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJXXX...
```
Kullanıcıdan bu iki değeri iste. Supabase Dashboard > Project Settings > API'den alınır.

### Adım 2 — Dashboard testi
.env.local doluysa:
1. pnpm dev çalıştır
2. Login yap (test kullanıcısı)
3. /dashboard'a git
4. Tablolar boşsa her şey 0 göstermeli — bu doğru davranış
5. Konsol hatası varsa burada tasks.md "Bilinen Sorunlar" bölümüne yaz

### Adım 3 — Rezervasyon takvimi (tasks.md Faz 2, 4. madde)
Dashboard çalışınca buna geç.

**Mimari:** Server Component wrapper + Client Component grid
- Sayfa: app/(dashboard)/reservations/page.tsx — Server Component, odaları ve rezervasyonları çeker
- Grid: components/admin/ReservationCalendar.tsx — Client Component ('use client')
- Grid yapısı: satır = oda, sütun = gün (bugünden +14 gün), hücre = rezervasyon durumu
- Veri: rooms tablosundan tüm aktif odalar + reservations tablosundan date range'e giren kayıtlar
- Renk kodu: confirmed=mavi, checked_in=yeşil, pending=sarı, cancelled=gri

**Kural hatırlatma:**
- DB okuma = Supabase server client, Server Component içinde
- DB yazma = Server Action + Zod validate
- client-side doğrudan supabase çağrısı YASAK

### Adım 4 — Yeni rezervasyon formu (tasks.md Faz 2, 5. madde)
Takvim bittikten sonra.

**Form alanları:**
- Misafir: isim, soyisim, telefon, email, uyruk (nationality), pasaport no (passport_number)
- Rezervasyon: oda seçimi (dropdown), check-in tarihi, check-out tarihi, yetişkin sayısı, özel istek
- Ödeme: ön ödeme tutarı (opsiyonel), yöntem (payme/click/nakit)

**Server Action pattern:**
```typescript
'use server'
import { z } from 'zod'

const reservationSchema = z.object({
  guestFirstName: z.string().min(1),
  guestLastName: z.string().min(1),
  roomId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  adults: z.number().min(1).max(4),
})

export async function createReservation(formData: FormData) {
  const validated = reservationSchema.parse(Object.fromEntries(formData))
  // supabase service_role ile yaz (RLS bypass için)
  // önce çakışma kontrolü: FOR UPDATE lock
  // sonra reservations insert
  // sonra availability tablosunu güncelle
}
```

**KRİTİK:** Çakışma kontrolü client'ta değil, server action içinde yapılacak.
Aynı odaya aynı tarihe çift rezervasyon girilmesini önlemek için:
reservations tablosuna INSERT yapmadan önce check_in/check_out aralığını sorgula.

---

## Mimari kurallar özeti (CLAUDE.md'den)

- `any` kullanma
- `useEffect` ile veri çekme — TanStack Query kullan (client okuma için)
- Server Action'larda Zod zorunlu
- `<img>` değil `next/image`
- localStorage kullanma
- Admin panelde fotoğraf ve 3D yok
- Büyük değişiklik öncesi "Bunu yapmak üzereyim: X. Devam edeyim mi?" de, bekle

---

## tasks.md güncelleme kuralı

Her tamamlanan adımdan sonra tasks.md'de ilgili satırı [ ] → [x] yap.
Karşılaştığın sorunları "Bilinen Sorunlar" bölümüne ekle.
