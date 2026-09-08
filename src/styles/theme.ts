/**
 * Theme colours and the hooks that read them. Kept separate from the stylesheet
 * so the per-feature sheets in ./sheets can depend on ThemeColors without a
 * circular import back through appStyles.
 */
import { ColorSchemeName, Platform, useColorScheme } from 'react-native';
import { ThemeMode, useAppStore } from '@/context/AppStoreContext';
import { brand } from '@/data/mockData';

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  card: string;
  cardElevated: string;
  text: string;
  subtext: string;
  muted: string;
  border: string;
  inputBg: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
  statusBarStyle: 'light' | 'dark';
}

export function getThemeColors(
  themeMode: ThemeMode,
  systemColorScheme?: ColorSchemeName
): ThemeColors {
  const effectiveMode =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  if (effectiveMode === 'midnight') {
    return {
      isDark: true,
      bg: '#050712',
      card: '#0D1126',
      cardElevated: '#141A38',
      text: '#F8FAFC',
      subtext: '#CBD5E1',
      muted: '#64748B',
      border: '#1E293B',
      inputBg: '#0F142E',
      tabBarBg: '#080B1C',
      tabBarActive: brand.primary,
      tabBarInactive: '#64748B',
      statusBarStyle: 'light',
    };
  }

  if (effectiveMode === 'dark') {
    return {
      isDark: true,
      bg: '#0F172A',
      card: '#1E293B',
      cardElevated: '#334155',
      text: '#F8FAFC',
      subtext: '#E2E8F0',
      muted: '#94A3B8',
      border: '#334155',
      inputBg: '#1E293B',
      tabBarBg: '#0F172A',
      tabBarActive: brand.primary,
      tabBarInactive: '#94A3B8',
      statusBarStyle: 'light',
    };
  }

  // Default light mode
  return {
    isDark: false,
    bg: '#F8FAFC',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    text: '#0F172A',
    subtext: '#475569',
    muted: '#64748B',
    border: '#E2E8F0',
    inputBg: '#F1F5F9',
    tabBarBg: '#FFFFFF',
    tabBarActive: brand.primary,
    tabBarInactive: '#64748B',
    statusBarStyle: 'dark',
  };
}

export function useThemeColors(): ThemeColors {
  const systemColorScheme = useColorScheme();
  try {
    const store = useAppStore();
    return getThemeColors(store.theme, systemColorScheme);
  } catch {
    return getThemeColors('light', systemColorScheme);
  }
}

export const nowTime = () =>
  new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 3,
  },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
