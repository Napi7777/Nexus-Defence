/**
 * Cross-cutting styles used by more than one feature.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import { shadowSm, space } from '../tokens';
import type { ThemeColors } from '../theme';

export const sharedStyles = (c: ThemeColors) =>
  StyleSheet.create({
    appShell: {
      flex: 1,
      backgroundColor: c.bg,
    },
    lightScreen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    flexFill: {
      flex: 1,
    },
    primaryButton: {
      backgroundColor: brand.primary,
      borderRadius: 18,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    formScreen: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 36,
      gap: 14,
    },
    backButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBg,
    },
    sectionHeadline: {
      fontSize: 34,
      fontWeight: '800',
      color: c.text,
      marginTop: 4,
    },
    sectionSubline: {
      color: c.muted,
      fontSize: 15,
      marginBottom: 6,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 15,
      color: c.text,
    },
    helperLink: {
      color: brand.primary,
      fontWeight: '800',
    },

    /* ---------- Auth flow (splash / onboarding / welcome / signup / signin) ----------
       These screens are full-bleed: the root View carries no safe-area padding so
       background art runs under the status bar and the bottom nav bar. Insets are
       applied to the content instead, via useSafeAreaInsets(). */
    authErrorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: '#FDECEA',
      borderColor: '#F5C6C2',
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    authErrorText: {
      flex: 1,
      color: '#8C2F27',
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    screenContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,
      gap: 18,
    },
    mutedCopy: {
      color: c.muted,
      fontSize: 14,
    },
    mutedCopySmall: {
      color: c.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    sectionHeadingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
    },
    sessionTime: {
      color: c.muted,
      fontSize: 13,
    },
    communityName: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    screenHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      flex: 1,
    },
    filterPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    recommendedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#E8E6F6',
      borderRadius: 18,
      padding: 14,
      ...shadowSm,
    },
    recommendedTitle: {
      color: brand.primary,
      fontWeight: '800',
      fontSize: 14,
    },
    largeCommunityCard: {
      overflow: 'hidden',
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...shadowSm,
    },
    cardBody: {
      padding: 14,
      gap: 10,
    },
    primarySmallButton: {
      flex: 1,
      backgroundColor: '#fff',
      paddingVertical: 12,
      borderRadius: 16,
      alignItems: 'center',
    },
    primarySmallText: {
      color: brand.primary,
      fontWeight: '800',
    },
    threadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    threadTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    threadName: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    threadTime: {
      color: c.muted,
      fontSize: 12,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '75%',
      gap: 14,
      ...shadowSm,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: brand.border,
      paddingBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
    },
    levelBadgeChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: '#FFF0D6',
      alignSelf: 'flex-start',
    },
    levelBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#B16A0E',
    },
  });
