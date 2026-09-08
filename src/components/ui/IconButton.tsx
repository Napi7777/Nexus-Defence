/** Icon-only buttons — square (`IconButton`) and round (`CircleIconButton`). */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function IconButton({
  icon,
  onPress,
  badge,
  filled,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
  filled?: boolean;
  /** Screen-reader name. Falls back to a readable form of the icon name. */
  label?: string;
}) {
  const colors = useThemeColors();
  // Icon-only buttons are invisible to screen readers without this.
  const accessibleName = label ?? icon.replace(/-(outline|sharp)$/, '').replace(/-/g, ' ');
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibleName}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.card, borderColor: colors.border },
        filled ? styles.iconButtonFilled : undefined,
        pressed && { opacity: 0.75, transform: [{ scale: 0.93 }] },
      ]}
    >
      <Ionicons name={icon} size={18} color={filled ? '#fff' : colors.text} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CircleIconButton({
  icon,
  onPress,
  filled,
  light,
  label,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  filled?: boolean;
  light?: boolean;
  /** Screen-reader name; falls back to a readable form of the icon name. */
  label?: string;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const accessibleName = label ?? icon.replace(/-(outline|sharp)$/, '').replace(/-/g, ' ');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibleName}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.circleIconButton,
        disabled && { opacity: 0.55 },
        { backgroundColor: colors.inputBg },
        filled ? styles.circleIconFilled : undefined,
        light ? styles.circleIconLight : undefined,
        pressed && { opacity: 0.75, transform: [{ scale: 0.93 }] },
      ]}
    >
      <Ionicons name={icon} size={18} color={filled ? '#fff' : light ? colors.text : '#fff'} />
    </Pressable>
  );
}
