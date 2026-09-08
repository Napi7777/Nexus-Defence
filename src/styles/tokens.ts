import { Platform, TextStyle } from 'react-native';

/**
 * Design tokens for NEXUS.
 *
 * Before this existed the app used 16 ad-hoc font sizes, 17 border radii and
 * three shadows total. These scales are the single source of truth — reach for
 * a token rather than a raw number when adding UI.
 */

/* ---------------------------------- Type --------------------------------- */

// Inter, loaded in App.tsx. Because a custom family is set per weight, the
// `Text` wrapper in components/Typography.tsx maps fontWeight -> family so the
// existing `fontWeight: '800'` style declarations keep working.
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export function familyForWeight(weight?: TextStyle['fontWeight']): string {
  switch (weight) {
    case '900':
    case '800':
      return font.extraBold;
    case 'bold':
    case '700':
      return font.bold;
    case '600':
      return font.semiBold;
    case '500':
      return font.medium;
    default:
      return font.regular;
  }
}

/** Six-step type ramp. Sizes are the only ones new UI should use. */
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  subheading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

/* --------------------------------- Shape --------------------------------- */

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
} as const;

/* -------------------------------- Elevation ------------------------------- */

function makeShadow(opacity: number, radiusPx: number, offsetY: number, elevation: number) {
  return Platform.select({
    android: { elevation },
    default: {
      shadowColor: '#000',
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: offsetY },
    },
  })!;
}

/** Resting cards. */
export const shadowSm = makeShadow(0.06, 8, 2, 2);
/** Raised surfaces — sheets, floating buttons. */
export const shadowMd = makeShadow(0.1, 16, 6, 6);
/** Overlays — toasts, modals. */
export const shadowLg = makeShadow(0.16, 28, 12, 12);

/* -------------------------------- Touch ---------------------------------- */

/**
 * Expands the touch target of small icon buttons to meet the 44pt minimum
 * without inflating their visual size.
 */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
