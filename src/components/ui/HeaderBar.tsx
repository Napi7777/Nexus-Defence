/** Back-navigation title bar used at the top of every pushed screen. */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { brand } from '@/data/mockData';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function HeaderBar({
  title,
  onBack,
  rightElement,
  light,
}: {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
  /** Pin to the light pre-auth palette instead of following the app theme. */
  light?: boolean;
}) {
  const colors = useThemeColors();
  const headerText = light ? brand.text : colors.text;
  return (
    <View style={styles.headerBar}>
      <Pressable
        onPress={onBack}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="arrow-back" size={20} color={headerText} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: headerText }]}>{title}</Text>
      {rightElement ? <View style={{ marginLeft: 'auto' }}>{rightElement}</View> : null}
    </View>
  );
}
