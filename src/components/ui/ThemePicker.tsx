import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { ThemeMode, useAppStore } from '@/context/AppStoreContext';
import { tapLight } from '@/lib/haptics';
import { styles, useThemeColors } from '@/styles/appStyles';

const THEME_OPTIONS: Array<{ key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'midnight', label: 'Midnight', icon: 'planet-outline' },
];

/**
 * Appearance control. The theme system supported light/dark/midnight from the
 * start but nothing ever called setTheme, so it was unreachable — this is the
 * entry point.
 */
export function ThemePicker() {
  const { theme, setTheme } = useAppStore();
  const colors = useThemeColors();

  return (
    <View style={styles.themePickerCard}>
      <Text style={styles.themePickerTitle}>Appearance</Text>
      <Text style={styles.themePickerHint}>Choose how NEXUS looks on this device.</Text>
      <View style={styles.themePickerRow} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                tapLight();
                setTheme(option.key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label + ' appearance'}
              style={({ pressed }) => [
                styles.themeOption,
                {
                  borderColor: active ? colors.tabBarActive : colors.border,
                  backgroundColor: active ? colors.tabBarActive : 'transparent',
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name={option.icon} size={18} color={active ? '#fff' : colors.muted} />
              <Text style={[styles.themeOptionText, { color: active ? '#fff' : colors.muted }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
