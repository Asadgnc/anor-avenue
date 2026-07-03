// Panel-wide color palette — "Navy + Gold" corporate theme.
// These values must stay in sync with the tokens in globals.css;
// legacy pages that use inline styles read from this object.

export const dash = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardShadow: '0 0 0 1px rgba(15, 23, 42, 0.08)', // thin line instead of a shadow
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#1E3A8A', // dark navy — button, link, active state
  primaryLight: '#EFF6FF',
  warm: '#B45309', // gold accent — WCAG AA compliant on white
  sidebar: '#16233B', // rich dark navy
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
  // Zone backgrounds neutralized — pastel zones removed from the design
  zonePurple: '#F1F5F9',
  zoneGreen: '#F1F5F9',
  zoneOrange: '#F1F5F9',
  zoneBlue: '#F1F5F9',
} as const
