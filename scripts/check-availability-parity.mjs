// Guards the MIRRORED availability engine: the two copies must stay
// byte-identical because the apps deploy separately (no shared package).
// Run: node scripts/check-availability-parity.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const files = [
  'admin-panel/src/lib/availability.ts',
  'guest-site/src/lib/availability.ts',
]

const hashes = files.map((f) => ({
  f,
  hash: createHash('sha256').update(readFileSync(f)).digest('hex'),
}))

if (hashes[0].hash === hashes[1].hash) {
  console.log('OK — availability.ts copies are identical (' + hashes[0].hash.slice(0, 12) + ')')
} else {
  console.error('MISMATCH — the mirrored availability.ts copies differ!')
  for (const h of hashes) console.error(`  ${h.hash.slice(0, 12)}  ${h.f}`)
  console.error('Edit both copies together, then re-run this check.')
  process.exit(1)
}
