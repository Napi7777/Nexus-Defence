import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function ActionRow({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.actionRow, { borderBottomColor: colors.border }, pressed && { opacity: 0.75, backgroundColor: colors.inputBg }]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: colors.inputBg }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
