/**
 * The app stylesheet.
 *
 * The 300-odd style rules live in ./sheets, split by the feature that uses
 * them; this file only stitches them together. Add a rule to the sheet for the
 * screen that needs it, or to sheets/shared.ts if more than one feature does.
 *
 * The sheet is built per theme rather than once at module load, so every screen
 * picks up light / dark / midnight without touching its own code. `styles`
 * below is a proxy onto the currently-active build: App.tsx calls
 * applyThemeStyles() during render, before any descendant reads a style, and a
 * theme change re-renders the whole tree — so reads always see the right build.
 */
import { authStyles } from './sheets/auth';
import { chatStyles } from './sheets/chat';
import { communitiesStyles } from './sheets/communities';
import { filtersStyles } from './sheets/filters';
import { homeStyles } from './sheets/home';
import { leaderboardStyles } from './sheets/leaderboard';
import { navigationStyles } from './sheets/navigation';
import { overlaysStyles } from './sheets/overlays';
import { profileStyles } from './sheets/profile';
import { sessionsStyles } from './sheets/sessions';
import { sharedStyles } from './sheets/shared';
import { uiStyles } from './sheets/ui';
import { getThemeColors, ThemeColors } from './theme';

export { getThemeColors, nowTime, shadow, useThemeColors } from './theme';
export type { ThemeColors } from './theme';

function buildStyles(c: ThemeColors) {
  return {
    ...sharedStyles(c),
    ...uiStyles(c),
    ...navigationStyles(c),
    ...authStyles(c),
    ...homeStyles(c),
    ...chatStyles(c),
    ...communitiesStyles(c),
    ...sessionsStyles(c),
    ...profileStyles(c),
    ...leaderboardStyles(c),
    ...filtersStyles(c),
    ...overlaysStyles(c),
  };
}

type AppStyles = ReturnType<typeof buildStyles>;

const styleCache = new Map<string, AppStyles>();

function buildCached(c: ThemeColors): AppStyles {
  const key = `${c.bg}|${c.card}|${c.text}|${c.border}|${c.inputBg}|${c.muted}`;
  let built = styleCache.get(key);
  if (!built) {
    built = buildStyles(c);
    styleCache.set(key, built);
  }
  return built;
}

let activeStyles: AppStyles = buildCached(getThemeColors('light'));

/** Swap the active stylesheet. Call during render, above the tree that reads it. */
export function applyThemeStyles(c: ThemeColors): void {
  activeStyles = buildCached(c);
}

export const styles = new Proxy({} as AppStyles, {
  get: (_target, prop: string) => (activeStyles as any)[prop],
  has: (_target, prop: string) => prop in (activeStyles as any),
  ownKeys: () => Reflect.ownKeys(activeStyles as any),
  getOwnPropertyDescriptor: (_target, prop) => ({
    ...Object.getOwnPropertyDescriptor(activeStyles as any, prop),
    configurable: true,
  }),
});
