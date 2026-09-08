/** The five-item bottom tab bar and its individual items. */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { HIT_SLOP } from '@/styles/tokens';
import { TabKey } from '@/context/AppStoreContext';
import { tapLight } from '@/lib/haptics';
import { styles, ThemeColors, useThemeColors } from '@/styles/appStyles';

function TabBarItem({
  item,
  active,
  onPress,
  colors,
}: {
  item: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap };
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={HIT_SLOP}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={styles.tabItem}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={active ? item.activeIcon : item.icon}
          size={20}
          color={active ? colors.tabBarActive : colors.tabBarInactive}
        />
        <Text style={[styles.tabLabel, { color: active ? colors.tabBarActive : colors.tabBarInactive }]}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const colors = useThemeColors();
  const items: Array<{
    key: TabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { key: 'communities', label: 'Communities', icon: 'people-outline', activeIcon: 'people' },
    { key: 'sessions', label: 'Sessions', icon: 'videocam-outline', activeIcon: 'videocam' },
    { key: 'chat', label: 'Chat', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.tabBarBg, borderTopColor: colors.border }]}>
      {items.map((item) => (
        <TabBarItem
          key={item.key}
          item={item}
          active={item.key === activeTab}
          onPress={() => onChange(item.key)}
          colors={colors}
        />
      ))}
    </View>
  );
}
