import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { styles, useThemeColors } from '@/styles/appStyles';

export function StatCard({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: string;
  accent?: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const content = (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: accent || colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}
