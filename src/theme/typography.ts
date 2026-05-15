import { TextStyle } from 'react-native';

// Click · Nordic Warm typography
//   Inter — весь интерфейс (заголовки, тело, подписи)
//   JetBrains Mono — числа, коды, таймеры

export const fonts = {
  // Inter — основной шрифт интерфейса
  sans:          'Inter_400Regular',
  sansMedium:    'Inter_500Medium',
  sansSemiBold:  'Inter_600SemiBold',
  sansBold:      'Inter_700Bold',
  sansExtraBold: 'Inter_800ExtraBold',

  // JetBrains Mono — данные
  mono:     'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',

  // Алиасы для обратной совместимости
  serif:        'Inter_700Bold',
  serifItalic:  'Inter_600SemiBold',
  display:      'Inter_700Bold',
  displayBold:  'Inter_800ExtraBold',
};

export const typography = {
  // ── Display — Inter ExtraBold ────────────────────────────────────────────
  displayXl: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.0,
  } as TextStyle,

  displayLg: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  } as TextStyle,

  display: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  } as TextStyle,

  displaySm: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,

  // ── Headings ─────────────────────────────────────────────────────────────
  h1: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  } as TextStyle,

  h3: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  } as TextStyle,

  // ── Body ─────────────────────────────────────────────────────────────────
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  bodyMedium: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  bodyBold: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  // ── Small ─────────────────────────────────────────────────────────────────
  small: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  smallMedium: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  smallBold: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  // ── Caption ──────────────────────────────────────────────────────────────
  tiny: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  } as TextStyle,

  tinyBold: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
  } as TextStyle,

  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // ── Button ───────────────────────────────────────────────────────────────
  button: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,
};

// 8pt grid — чуть просторнее для тёплого стиля
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

export const radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   22,
  pill: 999,
};
