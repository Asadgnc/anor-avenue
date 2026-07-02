// Panel geneli renk paleti — "Lacivert + Altın" kurumsal tema.
// Bu değerler globals.css'teki token'larla birebir aynı tutulmalı;
// inline style kullanan eski sayfalar bu objeden beslenir.

export const dash = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardShadow: '0 0 0 1px rgba(15, 23, 42, 0.08)', // gölge yerine ince çizgi
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#1E3A8A', // koyu lacivert — buton, link, aktif durum
  primaryLight: '#EFF6FF',
  warm: '#B45309', // altın vurgu — beyaz zeminde WCAG AA uyumlu
  sidebar: '#16233B', // zengin koyu lacivert
  sidebarHover: 'rgba(255,255,255,0.08)',
  pink: '#BE123C',
  pinkLight: '#FFE4E6',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  orange: '#D97706',
  orangeLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  blue: '#1D4ED8',
  blueLight: '#DBEAFE',
  // Bölge zeminleri nötrleştirildi — pastel bölgeler tasarımdan çıkarıldı
  zonePurple: '#F1F5F9',
  zoneGreen: '#F1F5F9',
  zoneOrange: '#F1F5F9',
  zoneBlue: '#F1F5F9',
} as const
