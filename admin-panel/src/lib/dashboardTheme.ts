// Yeni "light" dashboard tasarımına özel renk paleti.
// Not: bu paket sadece dashboard sayfasında kullanılıyor — uygulamanın geri kalanı
// hâlâ var(--color-admin-*) koyu temayı kullanıyor, global tokenlar değiştirilmedi.

export const dash = {
  bg: '#F6F5F9',
  card: '#FFFFFF',
  cardShadow: '0 1px 3px rgba(21, 17, 43, 0.06)',
  border: '#ECEEF5',
  text: '#15112B',
  muted: '#8A8AA3',
  primary: '#5B4FE9',
  primaryLight: '#EEF0FF',
  warm: '#D97757', // sıcak toprak/terrakota vurgu — otel kimliğine sıcaklık katmak için
  sidebar: '#2E2A52', // açık lacivert-indigo — hâlâ beyaz yazı için yeterli kontrast
  sidebarHover: 'rgba(255,255,255,0.08)',
  pink: '#FD5070',
  pinkLight: '#FFE3E8',
  green: '#22C55E',
  greenLight: '#E7F9EE',
  orange: '#F59E0B',
  orangeLight: '#FEF3E2',
  red: '#EF4444',
  redLight: '#FDEAEA',
  blue: '#3B82F6',
  blueLight: '#E8EFFE',
  // Tonlu bölge zeminleri — kategoriye göre gruplama için (kart yerine büyük zemin rengi)
  zonePurple: '#F1EFFA',
  zoneGreen: '#EEF8F1',
  zoneOrange: '#FDF3EC',
  zoneBlue: '#E8EFFE',
} as const
