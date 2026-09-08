/**
 * The points leaderboard.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import type { ThemeColors } from '../theme';

export const leaderboardStyles = (c: ThemeColors) =>
  StyleSheet.create({
    levelProgressTrack: {
      height: 8,
      backgroundColor: '#E2DFD7',
      borderRadius: 4,
      overflow: 'hidden',
      marginVertical: 6,
    },
    levelProgressFill: {
      height: '100%',
      backgroundColor: '#E07038',
    },
    perkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    perkIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#FFF4EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    perkCostBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: '#E6F4EA',
    },
    perkCostText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#137333',
    },
    voucherCodeBox: {
      backgroundColor: '#F4F2EE',
      padding: 14,
      borderRadius: 14,
      borderStyle: 'dashed',
      borderWidth: 1.5,
      borderColor: brand.primary,
      alignItems: 'center',
      marginVertical: 10,
    },
    voucherCodeText: {
      fontSize: 20,
      fontWeight: '800',
      color: brand.primary,
      letterSpacing: 2,
    },
  });
