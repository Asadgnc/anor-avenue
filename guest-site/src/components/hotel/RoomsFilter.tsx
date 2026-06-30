'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export default function RoomsFilter({ locale }: { locale: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sort = searchParams.get('sort') ?? ''
  const floor = searchParams.get('floor')
  const jacuzzi = searchParams.get('jacuzzi')
  const bathtub = searchParams.get('bathtub')

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const L =
    locale === 'uz'
      ? {
          sort: 'Saralash',
          sortDefault: "Oda raqami bo'yicha",
          sortPriceAsc: 'Narx: arzon → qimmat',
          sortPriceDesc: 'Narx: qimmat → arzon',
          sortView: 'Manzara: eng yaxshi',
          floor: 'Qavat',
          allFloors: 'Barcha qavatlar',
          gardenFloor: "Bog'cha qavati",
          features: 'Xususiyatlar',
          jacuzziLabel: 'Jakuzili',
          bathtubLabel: 'Hammomli',
        }
      : locale === 'ru'
      ? {
          sort: 'Сортировка',
          sortDefault: 'По номеру',
          sortPriceAsc: 'Цена: сначала дешевле',
          sortPriceDesc: 'Цена: сначала дороже',
          sortView: 'Вид: лучший',
          floor: 'Этаж',
          allFloors: 'Все этажи',
          gardenFloor: 'Садовый этаж',
          features: 'Особенности',
          jacuzziLabel: 'С джакузи',
          bathtubLabel: 'С ванной',
        }
      : {
          sort: 'Sort',
          sortDefault: 'Room number',
          sortPriceAsc: 'Price: low to high',
          sortPriceDesc: 'Price: high to low',
          sortView: 'View: best first',
          floor: 'Floor',
          allFloors: 'All floors',
          gardenFloor: 'Garden Floor',
          features: 'Features',
          jacuzziLabel: 'Jacuzzi',
          bathtubLabel: 'Bathtub',
        }

  const floorOptions = [
    { value: null, label: L.allFloors },
    { value: '-1', label: L.gardenFloor },
    { value: '2', label: locale === 'uz' ? '2-qavat' : locale === 'ru' ? '2 этаж' : 'Floor 2' },
    { value: '3', label: locale === 'uz' ? '3-qavat' : locale === 'ru' ? '3 этаж' : 'Floor 3' },
    {
      value: '4',
      label:
        locale === 'uz' ? '4-qavat (Mansard)' : locale === 'ru' ? '4 этаж (Мансард)' : 'Floor 4 (Mansard)',
    },
  ]

  const pill = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.9rem',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: active ? '1.5px solid var(--color-gold)' : '1.5px solid var(--color-cream-dark)',
    backgroundColor: active ? 'rgba(201,169,110,0.12)' : 'var(--color-white)',
    color: active ? 'var(--color-gold-dark)' : 'var(--color-text-secondary)',
  })

  const label: React.CSSProperties = {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    whiteSpace: 'nowrap',
  }

  const divider: React.CSSProperties = {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--color-cream-dark)',
    flexShrink: 0,
    alignSelf: 'center',
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-cream-dark)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
      }}
    >
      {/* Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={label}>{L.sort}</span>
        <select
          value={sort}
          onChange={(e) => update('sort', e.target.value || null)}
          style={{
            border: '1.5px solid var(--color-cream-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.65rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-white)',
            cursor: 'pointer',
          }}
        >
          <option value="">{L.sortDefault}</option>
          <option value="price_asc">{L.sortPriceAsc}</option>
          <option value="price_desc">{L.sortPriceDesc}</option>
          <option value="view_best">{L.sortView}</option>
        </select>
      </div>

      <div style={divider} />

      {/* Floor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={label}>{L.floor}</span>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {floorOptions.map((opt) => (
            <button
              key={opt.value ?? 'all'}
              onClick={() => update('floor', opt.value)}
              style={pill(opt.value === null ? !floor : floor === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={divider} />

      {/* Feature toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={label}>{L.features}</span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button onClick={() => update('jacuzzi', jacuzzi === 'true' ? null : 'true')} style={pill(jacuzzi === 'true')}>
            🛁 {L.jacuzziLabel}
          </button>
          <button onClick={() => update('bathtub', bathtub === 'true' ? null : 'true')} style={pill(bathtub === 'true')}>
            🛁 {L.bathtubLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
