/**
 * The design-system primitives in components/ui.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import { radius, shadowSm, space, type } from '../tokens';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';

export const uiStyles = (c: ThemeColors) =>
  StyleSheet.create({
    primaryButtonDisabled: {
      opacity: 0.55,
    },
    outlineButton: {
      borderWidth: 1.5,
      borderColor: brand.primary,
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    outlineButtonText: {
      color: brand.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: c.text,
    },
    inputMultiline: {
      minHeight: 116,
      textAlignVertical: 'top',
    },
    inputWrap: {
      justifyContent: 'center',
    },
    inputLight: {
      borderWidth: 1,
    },
    inputWithAction: {
      paddingRight: 52,
    },
    inputAction: {
      position: 'absolute',
      right: 14,
      height: 32,
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBg,
    },
    iconButtonFilled: {
      backgroundColor: brand.primary,
    },
    iconBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: brand.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    iconBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
    },
    statCard: {
      flex: 1,
      backgroundColor: c.inputBg,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      ...shadow,
      ...shadowSm,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: brand.primary,
    },
    statLabel: {
      color: c.muted,
      fontSize: 12,
      marginTop: 4,
    },
    searchBar: {
      backgroundColor: c.inputBg,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: '#E8E4DE',
      alignSelf: 'flex-start',
    },
    pillActive: {
      backgroundColor: brand.primary,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.muted,
    },
    pillTextActive: {
      color: '#fff',
    },
    pillCompact: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    ghostSmallButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#D4D4FF',
      paddingVertical: 12,
      borderRadius: 16,
      alignItems: 'center',
    },
    ghostSmallText: {
      color: '#fff',
      fontWeight: '800',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: brand.border,
    },
    actionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    circleIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleIconFilled: {
      backgroundColor: brand.primary,
    },
    circleIconLight: {
      backgroundColor: c.inputBg,
    },
    textAvatar: {
      backgroundColor: '#D67234',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textAvatarLabel: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },
    /* ------------------------------ Appearance ----------------------------- */
    themePickerCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      padding: space.lg,
      gap: space.sm,
      backgroundColor: c.card,
      borderColor: c.border,
      ...shadowSm,
    },
    themePickerTitle: {
      ...type.subheading,
      color: c.text,
    },
    themePickerHint: {
      ...type.caption,
      color: c.muted,
    },
    themePickerRow: {
      flexDirection: "row",
      gap: space.sm,
      marginTop: space.xs,
    },
    themeOption: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: space.md,
      paddingHorizontal: 4,
      borderRadius: radius.sm,
      borderWidth: 1.5,
    },
    themeOptionText: {
      ...type.label,
      textAlign: "center",
    },
  });
