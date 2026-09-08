/**
 * Global search, notification centre and the report sheet.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import type { ThemeColors } from '../theme';

export const overlaysStyles = (c: ThemeColors) =>
  StyleSheet.create({
    globalSearchBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'flex-start',
      paddingTop: 50,
    },
    globalSearchCard: {
      backgroundColor: c.card,
      marginHorizontal: 16,
      borderRadius: 22,
      padding: 18,
      maxHeight: '85%',
      gap: 12,
    },
    globalSearchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.inputBg,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    globalSearchInput: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      fontWeight: '600',
    },
    entityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: '#E0E7FF',
      alignSelf: 'flex-start',
    },
    entityBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: brand.primary,
    },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    notificationUnreadRow: {
      backgroundColor: '#EFF6FF',
      paddingHorizontal: 10,
      borderRadius: 14,
      borderBottomWidth: 0,
      marginBottom: 6,
    },
    notificationIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#E0E7FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationUnreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: brand.primary,
    },
  });
