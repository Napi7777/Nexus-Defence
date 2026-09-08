import { applyThemeStyles, getThemeColors, styles } from '@/styles/appStyles';

/**
 * The shared stylesheet is a Proxy onto a per-theme build that App.tsx swaps
 * during render. That indirection is easy to break by accident, so pin the
 * behaviour it depends on.
 */
describe('theme-aware stylesheet', () => {
  const light = getThemeColors('light');
  const dark = getThemeColors('dark');
  const midnight = getThemeColors('midnight');

  afterEach(() => {
    applyThemeStyles(light);
  });

  it('resolves screen background from the active theme', () => {
    applyThemeStyles(light);
    const lightBg = styles.appShell.backgroundColor;

    applyThemeStyles(dark);
    expect(styles.appShell.backgroundColor).toBe(dark.bg);
    expect(styles.appShell.backgroundColor).not.toBe(lightBg);

    applyThemeStyles(midnight);
    expect(styles.appShell.backgroundColor).toBe(midnight.bg);
  });

  it('resolves body text colour from the active theme', () => {
    applyThemeStyles(light);
    expect(styles.sectionTitle.color).toBe(light.text);

    applyThemeStyles(dark);
    expect(styles.sectionTitle.color).toBe(dark.text);
  });

  it('keeps the pre-auth flow on the fixed light palette', () => {
    // The splash/onboarding/welcome flow is deliberately light regardless of
    // the device theme, because its art and gradients are built for cream.
    applyThemeStyles(light);
    const authBg = styles.authScreen.backgroundColor;
    const heroColor = styles.heroTitle.color;

    applyThemeStyles(midnight);
    expect(styles.authScreen.backgroundColor).toBe(authBg);
    expect(styles.heroTitle.color).toBe(heroColor);
  });

  it('keeps white button text white on the brand fill', () => {
    applyThemeStyles(dark);
    expect(styles.primaryButtonText.color).toBe('#fff');
  });

  it('reuses one built stylesheet per theme', () => {
    applyThemeStyles(dark);
    const first = styles.appShell;
    applyThemeStyles(light);
    applyThemeStyles(dark);
    expect(styles.appShell).toBe(first);
  });
});
