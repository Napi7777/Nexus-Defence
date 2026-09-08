/**
 * Session list, scheduling and the live lobby.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import { shadowSm } from '../tokens';
import type { ThemeColors } from '../theme';

export const sessionsStyles = (c: ThemeColors) =>
  StyleSheet.create({
    meetupLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 2,
    },
    meetupLocationText: {
      textDecorationLine: 'underline',
    },
    liveHeroCard: {
      backgroundColor: brand.primary,
      borderRadius: 22,
      padding: 18,
      gap: 8,
      ...shadowSm,
    },
    liveHeroLabel: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    liveHeroTitle: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '800',
    },
    liveHeroMeta: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 14,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    sessionListCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
      ...shadowSm,
    },
    sessionListTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    mapPreviewBox: {
      width: '100%',
      height: 180,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#E2DFD7',
      marginVertical: 10,
    },
    mapPinMarker: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    directionsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      backgroundColor: '#EFF6FF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    directionsText: {
      color: '#1E40AF',
      fontSize: 13,
      fontWeight: '700',
    },
    hotspotWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginVertical: 6,
    },
    hotspotChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: c.inputBg,
    },
    hotspotChipActive: {
      backgroundColor: brand.primary,
    },
    hotspotChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.muted,
    },
    hotspotChipTextActive: {
      color: '#fff',
    },
  });
