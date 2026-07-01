'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Guest } from '@/types/hotel'

interface Props {
  guests: Guest[]
}

export default function GuestListClient({ guests }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return guests
    return guests.filter((g) => {
      const name = `${g.first_name} ${g.last_name}`.toLowerCase()
      return (
        name.includes(q) ||
        (g.phone ?? '').includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.passport_number ?? '').toLowerCase().includes(q) ||
        (g.nationality ?? '').toLowerCase().includes(q)
      )
    })
  }, [guests, search])

  return (
    <div className="space-y-4">
      {/* Arama */}
      <input
        type="text"
        placeholder="Ad, telefon, e-posta veya pasaport ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          backgroundColor: 'var(--color-admin-card)',
          border: '1px solid var(--color-admin-border)',
          color: '#15112B',
        }}
      />

      {search && (
        <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
          {filtered.length} sonuç
        </p>
      )}

      {/* Tablo */}
      <div
        style={{
          backgroundColor: 'var(--color-admin-card)',
          borderRadius: '0.75rem',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--color-admin-muted)' }}>
            <p className="text-4xl mb-3">👤</p>
            <p>{search ? 'Sonuç bulunamadı.' : 'Henüz misafir kaydı yok.'}</p>
            {!search && (
              <p className="text-xs mt-1">Rezervasyon oluşturulduğunda misafirler otomatik eklenir.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  {['Ad Soyad', 'Telefon', 'E-posta', 'Milliyet', 'Pasaport', 'İşlem'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-admin-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr
                    key={g.id}
                    style={{ borderBottom: '1px solid var(--color-admin-border)' }}
                    className="hover:bg-black/[0.03] transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-[#15112B]">
                      {g.first_name} {g.last_name}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.email ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.nationality ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                      {g.passport_number ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/guests/${g.id}`}
                        className="text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
