/**
 * Thread list and private chat.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import { space } from '../tokens';
import type { ThemeColors } from '../theme';

export const chatStyles = (c: ThemeColors) =>
  StyleSheet.create({
    threadPreview: {
      color: c.muted,
      fontSize: 13,
      marginTop: 4,
    },
    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#D46937',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    unreadText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 11,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: brand.border,
      backgroundColor: c.card,
    },
    onlineText: {
      color: '#59B980',
      fontSize: 12,
      fontWeight: '700',
    },
    chatMessages: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
    },
    chatDayMarker: {
      textAlign: 'center',
      color: c.muted,
      fontSize: 12,
      marginVertical: 8,
    },
    messageBubble: {
      maxWidth: '78%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    messageBubbleMine: {
      alignSelf: 'flex-end',
      backgroundColor: brand.primary,
    },
    messageBubbleTheirs: {
      alignSelf: 'flex-start',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
      color: c.text,
    },
    messageTextMine: {
      color: '#fff',
    },
    messageTime: {
      fontSize: 11,
      color: c.muted,
      alignSelf: 'flex-end',
    },
    messageTimeMine: {
      color: 'rgba(255,255,255,0.7)',
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: brand.border,
      backgroundColor: c.bg,
    },
    composerInput: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.text,
    },
    /* ------------------------- Chat attachments ------------------------- */
    attachmentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      paddingVertical: 2,
    },
    attachmentName: {
      flex: 1,
      textDecorationLine: "underline",
    },
  });
