// process-photos.mjs
// Ücretsiz (sharp) fotoğraf işleme hattı — Anor Avenue guest-site.
//
// Ne yapar:
//   guest-site/photos-incoming/  altındaki ham fotoğrafları okur,
//   dosya adının başındaki oda numarasına (veya "common") göre gruplar,
//   web için WebP'ye çevirip (yeniden boyutlandırma + kalite) şuraya dizer:
//     public/hotel-photos/rooms/{odaNo}/...webp
//     public/hotel-photos/common/...webp
//   Her oda için ilk görsel (veya adı "cover" olan) => cover.webp
//
// Dosya adı kuralı (kullanıcı kararı: "isim odayı belli eder"):
//   202-jacuzzi.jpg      -> rooms/202/jacuzzi.webp
//   202-cover.jpg        -> rooms/202/cover.webp
//   403-suite-1.jpg      -> rooms/403/suite-1.webp
//   101.jpg / 101 (2).jpg-> rooms/101/cover.webp / rooms/101/photo-2.webp
//   common-exterior.jpg  -> common/exterior.webp
//
// Çalıştırma:
//   cd guest-site
//   pnpm add -D sharp        (bir kez; ücretsiz)
//   node scripts/process-photos.mjs
//
// Not: Ham dosyalara dokunmaz; sadece okur. Tekrar çalıştırılabilir (idempotent).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INCOMING = path.join(ROOT, 'photos-incoming')
const OUT_ROOMS = path.join(ROOT, 'public', 'hotel-photos', 'rooms')
const OUT_COMMON = path.join(ROOT, 'public', 'hotel-photos', 'common')

// Web hedefleri: kapak/geniş görseller daha büyük, galeri daha küçük.
const MAX_WIDTH = 1920 // hero/kapak üst sınırı
const QUALITY = 80 // WebP kalite (yavaş internet için makul)

const IMG_RE = /\.(jpe?g|png|webp|heic|heif)$/i

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error(
    '\n[HATA] "sharp" kurulu değil. Şu komutu bir kez çalıştır:\n  cd guest-site && pnpm add -D sharp\n'
  )
  process.exit(1)
}

// Oda numarası olmayan ortak-alan dosyaları için Türkçe/İng. kelime -> slug
const COMMON_WORDS = [
  [/(bah[cç]e|garden|hovli|dvor)/i, 'garden'],
  [/(cephe|d[ıi]s|exterior|facade|bino)/i, 'exterior'],
  [/(mutfak|kitchen|oshxona)/i, 'kitchen'],
  [/(kahvalt|breakfast|nonushta|zavtrak)/i, 'breakfast'],
  [/(resepsiyon|reception|lobi|lobby)/i, 'reception'],
  [/(koridor|corridor|hallway)/i, 'corridor'],
  [/(camasir|çama[sş]ir|laundry|kir xona)/i, 'laundry'],
]

function parseName(fileName) {
  const base = fileName.replace(IMG_RE, '')
  // "common" ön eki
  const commonMatch = base.match(/^common[-_ ]*(.*)$/i)
  if (commonMatch) {
    const desc = slug(commonMatch[1]) || 'photo'
    return { group: 'common', desc }
  }
  // Baştaki oda numarası (2-4 hane): "202-jacuzzi", "101 (2)", "403_suite_1"
  const roomMatch = base.match(/^(\d{2,4})[-_ ().]*(.*)$/)
  if (roomMatch) {
    const room = roomMatch[1]
    const desc = slug(roomMatch[2])
    return { group: room, desc }
  }
  // Oda numarası yok → ortak-alan kelimesi ara
  for (const [re, name] of COMMON_WORDS) {
    if (re.test(base)) return { group: 'common', desc: name }
  }
  return { group: null, desc: slug(base) }
}

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Bir dosyanın "kapak olma" puanı — oda/yatak/manzara yüksek, banyo/koridor düşük.
function coverScore(descRaw) {
  const d = descRaw.toLowerCase()
  let s = 0
  if (/(banyo|tuvalet|wc|dush|shower|kuvet|k[uü]vet|jakuzi|jacuzzi)/.test(d)) s -= 5
  if (/(koridor|corridor|hall|entrance|kirish|giris|giriş)/.test(d)) s -= 3
  if (/(oda|room|yatak|bed|suite|suit|lux|geni|genis|geniş|sandalye|dolap|sofa|manzara|view)/.test(d)) s += 4
  if (d === '' || d === '1' || d === 'cover') s += 6
  return s
}

async function main() {
  let files
  try {
    files = (await fs.readdir(INCOMING)).filter((f) => IMG_RE.test(f))
  } catch {
    console.error(`\n[HATA] Gelen kutusu bulunamadı: ${INCOMING}\nÖnce ham fotoğrafları buraya koy.\n`)
    process.exit(1)
  }
  if (files.length === 0) {
    console.log(`Gelen kutusunda işlenecek görsel yok: ${INCOMING}`)
    return
  }

  files.sort()

  // 1) Ayrıştır + grupla
  const groups = new Map() // group -> [{ file, desc }]
  const skipped = []
  for (const file of files) {
    const { group, desc } = parseName(file)
    if (!group) {
      skipped.push(file)
      continue
    }
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push({ file, desc })
  }

  // 2) Her grupta kapağı seç (en yüksek puan), sonra hepsini yaz
  let ok = 0
  for (const [group, items] of groups) {
    const isCommon = group === 'common'
    const outDir = isCommon ? OUT_COMMON : path.join(OUT_ROOMS, group)
    await fs.mkdir(outDir, { recursive: true })

    // Kapak: sadece odalar için (common'da kapak kavramı yok)
    let coverIdx = -1
    if (!isCommon) {
      let best = -Infinity
      items.forEach((it, idx) => {
        const sc = coverScore(it.desc)
        if (sc > best) {
          best = sc
          coverIdx = idx
        }
      })
    }

    const usedNames = new Set()
    let counter = 0
    for (let idx = 0; idx < items.length; idx++) {
      const { file, desc } = items[idx]
      let outName
      if (idx === coverIdx) {
        outName = 'cover'
      } else if (desc) {
        outName = desc
      } else {
        outName = `photo-${++counter}`
      }
      // Çakışma önle
      while (usedNames.has(outName)) outName = `${outName}-${++counter}`
      usedNames.add(outName)

      const outPath = path.join(outDir, `${outName}.webp`)
      try {
        await sharp(path.join(INCOMING, file))
          .rotate() // EXIF yönünü uygula
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(outPath)
        ok++
        console.log(`  ✓ ${file}  ->  ${path.relative(ROOT, outPath)}`)
      } catch (e) {
        skipped.push(`${file} (${e.message})`)
      }
    }
  }

  console.log(`\nBitti: ${ok} görsel işlendi.`)
  if (skipped.length) {
    console.log(`\nAtlanan (oda no'su çözülemedi / hata) — dosya adını 'odaNo-...' yap:`)
    for (const s of skipped) console.log(`  - ${s}`)
  }
}

main()
