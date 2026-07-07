// roomPhotos.ts — Oda-bazlı fotoğraf çözümleme (SUNUCU tarafı; fs kullanır).
//
// Fotoğraflar public/hotel-photos/rooms/{odaNo}/ altında tutulur (bkz.
// scripts/process-photos.mjs). Bu modül klasördeki GERÇEK dosyaları okur:
// gerçek foto yoksa nötr bir fallback döner (stok oda fotosu SUNMAYIZ —
// CLAUDE.md kuralı). Sadece server component'lerden import edilmeli.

import { promises as fs } from 'node:fs'
import path from 'node:path'

// Gerçek foto gelene kadar nötr yer tutucu — otelin gerçek dış cephesi
// (oda fotosu gibi sunulmaz; sadece görsel boşluğu doldurur).
export const PHOTO_FALLBACK = '/hotel-photos/hotel-exterior.jpeg'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const IMG_RE = /\.(webp|jpe?g|png)$/i

export type GalleryItem = { src: string; kind: string }

// Dosya adından anlamlı "kind" tahmini (galeri etiketini yerelleştirmek için).
function kindFromName(base: string): string {
  const b = base.toLowerCase()
  if (b.includes('cover')) return 'cover'
  if (b.includes('jacuzzi') || b.includes('jakuzi')) return 'jacuzzi'
  if (b.includes('bathtub') || b.includes('tub') || b.includes('kuvet')) return 'bathtub'
  if (b.includes('bath') || b.includes('banyo') || b.includes('shower') || b.includes('dush') || b.includes('wc'))
    return 'bathroom'
  if (b.includes('view') || b.includes('manzara') || b.includes('window') || b.includes('pencere')) return 'view'
  if (b.includes('suite') || b.includes('suit') || b.includes('living') || b.includes('sofa')) return 'suite'
  if (b.includes('entrance') || b.includes('door') || b.includes('hall') || b.includes('koridor')) return 'entrance'
  if (b.includes('bed') || b.includes('yatak')) return 'bedroom'
  return 'bedroom'
}

async function listRoomFiles(roomNumber: string): Promise<string[]> {
  const dir = path.join(PUBLIC_DIR, 'hotel-photos', 'rooms', roomNumber)
  try {
    const files = (await fs.readdir(dir)).filter((f) => IMG_RE.test(f))
    // cover her zaman önce
    files.sort((a, b) => {
      const ac = /cover/i.test(a) ? 0 : 1
      const bc = /cover/i.test(b) ? 0 : 1
      return ac - bc || a.localeCompare(b)
    })
    return files
  } catch {
    return []
  }
}

/** Oda kapak görseli — gerçek cover.webp varsa onu, yoksa ilk gerçek fotoyu,
 *  hiç yoksa nötr fallback'i döner. */
export async function getRoomCover(roomNumber: string): Promise<string> {
  const files = await listRoomFiles(roomNumber)
  if (files.length === 0) return PHOTO_FALLBACK
  return `/hotel-photos/rooms/${roomNumber}/${files[0]}`
}

/** Odanın tüm galerisi (cover önce). Gerçek foto yoksa boş dizi döner. */
export async function getRoomGallery(roomNumber: string): Promise<GalleryItem[]> {
  const files = await listRoomFiles(roomNumber)
  return files.map((f) => ({
    src: `/hotel-photos/rooms/${roomNumber}/${f}`,
    kind: kindFromName(f.replace(IMG_RE, '')),
  }))
}

/** Bir odada gerçek foto var mı? */
export async function hasRoomPhotos(roomNumber: string): Promise<boolean> {
  return (await listRoomFiles(roomNumber)).length > 0
}

// ─── Ortak alan (common) görselleri: breakfast / garden / reception … ──────────
// Dosyalar public/hotel-photos/common/{kategori}-{n}.webp (bkz. process-photos.mjs).

/** Bir kategorinin tüm görselleri, numaraya göre sıralı. Yoksa boş dizi. */
export async function getCommonGallery(category: string): Promise<string[]> {
  const dir = path.join(PUBLIC_DIR, 'hotel-photos', 'common')
  try {
    const files = (await fs.readdir(dir)).filter(
      (f) => IMG_RE.test(f) && new RegExp(`^${category}-\\d+\\.`, 'i').test(f)
    )
    files.sort((a, b) => {
      const na = Number(a.match(/-(\d+)\./)?.[1] ?? 0)
      const nb = Number(b.match(/-(\d+)\./)?.[1] ?? 0)
      return na - nb
    })
    return files.map((f) => `/hotel-photos/common/${f}`)
  } catch {
    return []
  }
}

/** Kategorinin ilk görseli (kapak) ya da null. */
export async function getCommonCover(category: string): Promise<string | null> {
  const g = await getCommonGallery(category)
  return g[0] ?? null
}
