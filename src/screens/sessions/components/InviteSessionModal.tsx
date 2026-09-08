import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';

export function InviteSessionModal({
  visible,
  onClose,
  sessionId,
  sessionTitle = 'Live Study Session',
  hostName = 'Peer Tutor',
}: {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle?: string;
  hostName?: string;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const inviteUrl = `https://nexus-learning.app/session/${sessionId}`;
  const deepLinkUrl = `nexus://session/${sessionId}`;

  const shareMessage = `Join my live study session on Nexus!\n\n📚 Session: ${sessionTitle}\n👤 Host: ${hostName}\n🔗 Link: ${inviteUrl}\n🆔 Meeting ID: ${sessionId}`;

  const handleCopyLink = async () => {
    tapLight();
    try {
      await Clipboard.setStringAsync(inviteUrl);
    } catch {
      // fallback
    }
    notifySuccess();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyId = async () => {
    tapLight();
    try {
      await Clipboard.setStringAsync(sessionId);
    } catch {
      // fallback
    }
    notifySuccess();
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleNativeShare = async () => {
    tapMedium();
    try {
      await Share.share({
        title: `Join ${sessionTitle} on Nexus`,
        message: shareMessage,
        url: inviteUrl,
      });
    } catch {
      // dismissed or cancelled
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.95)' }}>
        <View style={inviteStyles.container}>
          {/* Header */}
          <View style={inviteStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={inviteStyles.iconBadge}>
                <Ionicons name="link-outline" size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                  Invite to Live Session
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                  Share link or meeting ID with your study peers
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={inviteStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
            {/* Session Info Banner */}
            <View style={inviteStyles.infoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={inviteStyles.liveIndicator}>
                  <View style={inviteStyles.liveDot} />
                  <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800' }}>LIVE NOW</Text>
                </View>
                <Text style={{ color: '#E2E8F0', fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {sessionTitle}
                </Text>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                Host: <Text style={{ color: '#38BDF8', fontWeight: '600' }}>{hostName}</Text>
              </Text>
            </View>

            {/* Generated Web Link Card */}
            <View style={inviteStyles.sectionCard}>
              <Text style={inviteStyles.sectionLabel}>SESSION INVITE LINK</Text>
              <View style={inviteStyles.linkRow}>
                <Text style={inviteStyles.linkText} numberOfLines={1} ellipsizeMode="middle">
                  {inviteUrl}
                </Text>
                <Pressable
                  onPress={handleCopyLink}
                  style={({ pressed }) => [
                    inviteStyles.copyPill,
                    copiedLink && inviteStyles.copiedPill,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name={copiedLink ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copiedLink ? '#34D399' : '#38BDF8'}
                  />
                  <Text
                    style={[
                      inviteStyles.copyPillText,
                      copiedLink && { color: '#34D399' },
                    ]}
                  >
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Meeting ID Card */}
            <View style={inviteStyles.sectionCard}>
              <Text style={inviteStyles.sectionLabel}>MEETING ID</Text>
              <View style={inviteStyles.linkRow}>
                <Text style={inviteStyles.meetingIdText}>
                  {sessionId}
                </Text>
                <Pressable
                  onPress={handleCopyId}
                  style={({ pressed }) => [
                    inviteStyles.copyPill,
                    copiedId && inviteStyles.copiedPill,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name={copiedId ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copiedId ? '#34D399' : '#38BDF8'}
                  />
                  <Text
                    style={[
                      inviteStyles.copyPillText,
                      copiedId && { color: '#34D399' },
                    ]}
                  >
                    {copiedId ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Share via System Action */}
            <Pressable
              onPress={handleNativeShare}
              style={({ pressed }) => [
                inviteStyles.shareBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="share-social" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                Share Invite Link...
              </Text>
            </Pressable>

            {/* Helper tips */}
            <View style={inviteStyles.tipCard}>
              <Ionicons name="information-circle-outline" size={18} color="#38BDF8" style={{ marginTop: 1 }} />
              <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 18, flex: 1 }}>
                Anyone with this link or meeting ID can join this live interactive classroom instantly from mobile or desktop.
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const inviteStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  linkText: {
    color: '#E2E8F0',
    fontSize: 13,
    flex: 1,
    fontFamily: 'monospace',
  },
  meetingIdText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  copiedPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  copyPillText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
});
