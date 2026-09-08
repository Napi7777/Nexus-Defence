import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function Pill({
  label,
  active,
  tint,
  textColor,
  compact,
  onPress,
}: {
  label: string;
  active?: boolean;
  tint?: string;
  textColor?: string;
  compact?: boolean;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const content = (
    <View
      style={[
        styles.pill,
        { backgroundColor: colors.inputBg },
        active ? styles.pillActive : undefined,
        tint ? { backgroundColor: tint } : undefined,
        compact ? styles.pillCompact : undefined,
      ]}
    >
      <Text style={[styles.pillText, { color: colors.text }, active ? styles.pillTextActive : undefined, textColor ? { color: textColor } : undefined]}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable hitSlop={HIT_SLOP} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}
