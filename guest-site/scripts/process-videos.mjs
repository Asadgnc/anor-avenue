// process-videos.mjs — Ücretsiz video sıkıştırma hattı — Anor Avenue guest-site.
//
// Ne yapar:
//   photos-incoming/newphotos/ altındaki ham .MOV klibleri (aşağıdaki KÜRATÖRLÜ
//   listeye göre) web için sıkıştırır:
//     - 720p (uzun kenar <=1280), H.264, +faststart (web'de anında başlar)
//     - "feature" klipler: sesli, tam uzunluk (tıkla-oynat)
//     - "ambient" klipler: sessiz, kısa (döngüyle sessiz otomatik oynatma)
//   Her klip için bir poster (kapak) .jpg de üretir.
//   Çıktı: public/videos/{ad}.mp4 + public/videos/{ad}.jpg
//
// ffmpeg: sistemde kurulu olması gerekmez — ffmpeg-static (dev dep) kullanılır.
//
// Çalıştırma:  cd guest-site && node scripts/process-videos.mjs
// Not: Ham .MOV dosyaları repoya girmez (.gitignore); sadece işlenmiş mp4/jpg commit edilir.

import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const run = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'photos-incoming', 'newphotos')
const OUT = path.join(ROOT, 'public', 'videos')

// ── Kürasyon: hangi ham klip → hangi web klibi ──────────────────────────────
// mode: 'feature' (sesli, tam) | 'ambient' (sessiz, kısa döngü)
// poster: kapak karesi için saniye. trim: ambient için saniye (0 = tam).
const CLIPS = [
  { src: 'oteltanitimvideosugenel.MOV', out: 'otel-tanitim', mode: 'feature', poster: 3 },
  { src: 'resepshonntanitimvideo.MOV', out: 'resepsiyon', mode: 'feature', poster: 2 },
  { src: 'kahvaltitanitimvideo.MOV', out: 'kahvalti', mode: 'feature', poster: 1.5 },
  { src: '201odavideosu.MOV', out: 'odalar', mode: 'feature', poster: 1 },
  { src: 'otelbahchebirchokachi.MOV', out: 'bahce', mode: 'ambient', poster: 1.5, trim: 16 },
  { src: 'bahchenarvideo.MOV', out: 'bahce-nar', mode: 'ambient', poster: 1.5, trim: 0 },
]

// Uzun kenarı 1280'e indir (bölünebilir çift boyut), en-boy oranını koru.
const SCALE = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'"

async function encode(clip) {
  const inPath = path.join(SRC, clip.src)
  try {
    await fs.access(inPath)
  } catch {
    console.log(`  ⚠ atlandı (bulunamadı): ${clip.src}`)
    return false
  }
  const mp4 = path.join(OUT, `${clip.out}.mp4`)
  const jpg = path.join(OUT, `${clip.out}.jpg`)

  // ── Video ──
  const args = ['-y', '-i', inPath]
  if (clip.mode === 'ambient' && clip.trim) args.push('-t', String(clip.trim))
  args.push(
    '-vf', SCALE,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', clip.mode === 'ambient' ? '30' : '27',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart'
  )
  if (clip.mode === 'ambient') args.push('-an') // sessiz
  else args.push('-c:a', 'aac', '-b:a', '96k')
  args.push(mp4)
  await run(ffmpegPath, args, { maxBuffer: 1 << 26 })

  // ── Poster ──
  await run(
    ffmpegPath,
    ['-y', '-ss', String(clip.poster ?? 1), '-i', inPath, '-frames:v', '1', '-vf', SCALE, '-q:v', '3', jpg],
    { maxBuffer: 1 << 26 }
  )

  const { size } = await fs.stat(mp4)
  console.log(`  ✓ ${clip.src}  ->  videos/${clip.out}.mp4  (${(size / 1048576).toFixed(1)} MB, ${clip.mode})`)
  return true
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  console.log(`ffmpeg: ${ffmpegPath}\n`)
  let ok = 0
  for (const clip of CLIPS) if (await encode(clip)) ok++
  console.log(`\nBitti: ${ok}/${CLIPS.length} klip işlendi -> public/videos/`)
}

main()
