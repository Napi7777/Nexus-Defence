/** Frame around every tabbed screen: safe area, content slot, tab bar. */
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabBar } from './TabBar';
import { TabKey } from '@/context/AppStoreContext';
import { styles, useThemeColors } from '@/styles/appStyles';

export function MainShell({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.mainShell, { backgroundColor: colors.bg }]}>
      <View style={styles.flexFill}>{children}</View>
      <TabBar activeTab={activeTab} onChange={onTabChange} />
    </SafeAreaView>
  );
}
