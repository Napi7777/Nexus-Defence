/**
 * Tab bar and app shell chrome.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import { space } from '../tokens';
import type { ThemeColors } from '../theme';

export const navigationStyles = (c: ThemeColors) =>
  StyleSheet.create({
    mainShell: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      paddingBottom: 18,
      borderTopWidth: 1,
      borderTopColor: brand.border,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    tabItem: {
      alignItems: 'center',
      gap: 4,
      minWidth: 62,
    },
    tabLabel: {
      fontSize: 11,
      color: c.muted,
    },
  });
