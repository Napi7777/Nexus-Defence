/**
 * The tutor discovery filter sheet.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import type { ThemeColors } from '../theme';

export const filtersStyles = (c: ThemeColors) =>
  StyleSheet.create({
    filterSection: {
      gap: 10,
      marginBottom: 8,
    },
    filterTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    filterWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: c.inputBg,
    },
    filterChipActive: {
      backgroundColor: brand.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.muted,
    },
    filterChipTextActive: {
      color: '#fff',
    },
  });
