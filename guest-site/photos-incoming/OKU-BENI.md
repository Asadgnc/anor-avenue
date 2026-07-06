# Fotoğraf Gelen Kutusu — Anor Avenue

Ham oda/otel fotoğraflarını **bu klasöre** koy. Sonra otomatik olarak WebP'ye çevrilip
`public/hotel-photos/rooms/{odaNo}/` ve `public/hotel-photos/common/` altına dizilir.

## Dosya adı kuralı (ÖNEMLİ)

Her dosyanın adı **oda numarasıyla** başlasın. Açıklama isteğe bağlı:

| Dosya adı örneği | Nereye gider |
|---|---|
| `202-cover.jpg`   | rooms/202/cover.webp (kapak) |
| `202-jacuzzi.jpg` | rooms/202/jacuzzi.webp |
| `202-bed.jpg`     | rooms/202/bed.webp |
| `304-bathtub.jpg` | rooms/304/bathtub.webp |
| `403-suite-1.jpg` | rooms/403/suite-1.webp |
| `101.jpg`         | rooms/101/cover.webp |
| `common-exterior-day.jpg` | common/exterior-day.webp |
| `common-garden.jpg`       | common/garden.webp |

- Oda numaraları: **101, 102, 103, 201, 202, 301, 302, 303, 304, 401, 402, 403**
- Cephe / bahçe / mutfak / resepsiyon / koridor gibi ortak alanlar: **`common-...`**
- Her oda için ilk foto (veya adı `cover` olan) kapak olur.

## İşleme (bir kez kurulum)

```bash
cd guest-site
pnpm add -D sharp
node scripts/process-photos.mjs
```

> Claude bunu senin yerine çalıştırabilir — sen sadece dosyaları buraya at ve
> "işle" de. Ham dosyalara dokunulmaz; istediğin kadar tekrar çalıştırılabilir.
