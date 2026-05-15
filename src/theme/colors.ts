// Click · Nordic Warm — светлая тёплая тема, бургундский бренд
export const colors = {
  // ── Backgrounds — тёплый белый ──────────────────────────────────────────
  bg:      '#FAF8F5',          // тёплый белый базовый фон
  bg2:     '#FFFFFF',          // белые карточки
  bg3:     '#F0ECE7',          // слабые фоны, инпуты
  bg4:     '#E6E0D9',          // разделители, неактивные
  bgDark:  '#6E1222',          // бургундский — цвет термосумки Click

  // ── Text — тёплые тоны ──────────────────────────────────────────────────
  text:          '#1C1410',                 // тёплый чёрный
  textSecondary: 'rgba(28,20,16,0.60)',
  textMuted:     'rgba(28,20,16,0.38)',
  textDisabled:  'rgba(28,20,16,0.20)',

  // ── Borders ─────────────────────────────────────────────────────────────
  border:  'rgba(28,20,16,0.08)',
  border2: 'rgba(28,20,16,0.15)',
  divider: 'rgba(28,20,16,0.05)',

  // ── Primary — бургундский Click (вместо фиолетового) ────────────────────
  primary:      '#6E1222',
  primaryLight: '#9B1A2F',
  primaryDark:  '#4E0D18',
  primaryFaint: 'rgba(110,18,34,0.08)',
  primaryGlow:  'rgba(110,18,34,0.20)',

  // ── Semantic ────────────────────────────────────────────────────────────
  green:       '#16A34A',
  greenFaint:  'rgba(22,163,74,0.10)',
  amber:       '#D97706',
  amberFaint:  'rgba(217,119,6,0.10)',
  blue:        '#2563EB',
  blueFaint:   'rgba(37,99,235,0.10)',
  danger:      '#DC2626',
  dangerFaint: 'rgba(220,38,38,0.09)',
  purple:      '#7C3AED',
  purpleFaint: 'rgba(124,58,237,0.10)',

  // ── Aliases ─────────────────────────────────────────────────────────────
  background:          '#FAF8F5',
  backgroundSecondary: '#FFFFFF',
  card:                '#FFFFFF',
  cardElevated:        '#F5F1EC',
  success:             '#16A34A',
  successDark:         '#15803D',
  successLight:        'rgba(22,163,74,0.10)',
  warning:             '#D97706',
  warningLight:        'rgba(217,119,6,0.10)',
  info:                '#2563EB',
  infoLight:           'rgba(37,99,235,0.10)',
  shiftOn:             '#16A34A',
  shiftOff:            'rgba(28,20,16,0.30)',
  mapCourier:          '#2563EB',
  mapRestaurant:       '#D97706',
  mapClient:           '#16A34A',
  shadow:              'rgba(28,20,16,0.08)',
  overlay:             'rgba(28,20,16,0.48)',
  primaryDark2:        '#4E0D18',
};

export type Colors = typeof colors;
