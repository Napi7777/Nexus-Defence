/** The four button variants: full-width primary/outline and their small siblings. */
import { ActivityIndicator, Pressable } from 'react-native';

import { Text } from './Text';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  /** Shows a spinner and blocks repeat presses while an async action is in flight. */
  loading?: boolean;
  disabled?: boolean;
}) {
  const blocked = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.primaryButton,
        blocked && styles.primaryButtonDisabled,
        pressed && !blocked && { opacity: 0.82, transform: [{ scale: 0.97 }] },
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.outlineButton, { borderColor: colors.border }, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.outlineButtonText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function PrimarySmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.primarySmallButton, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.primarySmallText}>{label}</Text>
    </Pressable>
  );
}

export function GhostSmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.ghostSmallButton, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.ghostSmallText, { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}
