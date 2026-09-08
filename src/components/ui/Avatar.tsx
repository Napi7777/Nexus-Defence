import { Pressable, View } from 'react-native';

import { AppImage } from '@/components/media/AppImage';
import { Text } from './Text';
import { styles } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function Avatar({
  source,
  size,
  onPress,
}: {
  source: string;
  size: number;
  onPress?: () => void;
}) {
  const isImageUri =
    typeof source === 'string' &&
    (source.startsWith('http://') ||
      source.startsWith('https://') ||
      source.startsWith('file:') ||
      source.startsWith('content:') ||
      source.startsWith('ph:') ||
      source.startsWith('blob:') ||
      source.startsWith('data:'));

  const content = isImageUri ? (
    <AppImage source={{ uri: source }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View
      style={[
        styles.textAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.textAvatarLabel}>{source}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable hitSlop={HIT_SLOP} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}
