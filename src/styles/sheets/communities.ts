/**
 * Community list, detail and creation.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import { radius, space, type } from '../tokens';
import type { ThemeColors } from '../theme';

export const communitiesStyles = (c: ThemeColors) =>
  StyleSheet.create({
    /** Wraps a FlatList ListHeaderComponent so its sections are spaced. */
    listHeader: {
      gap: 18,
      paddingBottom: 14,
    },
    /** ItemSeparatorComponent height for card-style list rows. */
    listSeparator: {
      height: 14,
    },
    recommendedIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#D8D3FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    largeCommunityImage: {
      width: '100%',
      height: 126,
    },
    cardTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    communityHero: {
      height: 240,
      justifyContent: 'flex-end',
      backgroundColor: brand.primary,
    },
    /** Pulls the hero out of screenContent's padding so it bleeds edge to edge. */
    communityHeroBleed: {
      marginHorizontal: -20,
      marginTop: -14,
      marginBottom: 4,
    },
    communityHeroBody: {
      paddingHorizontal: 20,
      paddingBottom: 18,
      gap: 2,
    },
    heroIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(7,9,24,0.45)',
    },
    communityHeroTitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '800',
    },
    communityHeroMeta: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
    },
    communityTabRow: {
      flexDirection: 'row',
      gap: 20,
      paddingHorizontal: 20,
      paddingVertical: 14,
      marginHorizontal: -20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.card,
    },
    communityTabText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.muted,
    },
    communityTabTextActive: {
      color: brand.primary,
      borderBottomWidth: 2,
      borderBottomColor: brand.primary,
    },
    sharePrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      marginHorizontal: 20,
      marginTop: 14,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    communityPanel: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 12,
    },
    communityPanelTitle: {
      ...type.bodyStrong,
      color: c.text,
      marginBottom: 8,
    },
    communityPanelHint: {
      ...type.caption,
      color: c.muted,
    },
    postCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      marginHorizontal: 20,
      marginTop: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    postTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    postBody: {
      color: c.text,
      fontSize: 14,
      lineHeight: 20,
    },
    stickyBottomActions: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: brand.border,
    },
    resourceFileRow: {
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
    pdfIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    downloadPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: brand.primary,
    },
    downloadPillDone: {
      backgroundColor: '#E6F4EA',
    },
    fileSizeText: {
      fontSize: 11,
      color: c.muted,
      marginTop: 2,
    },
  });
