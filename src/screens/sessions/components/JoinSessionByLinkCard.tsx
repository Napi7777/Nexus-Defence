import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useToast } from '@/components/feedback';
import { Text } from '@/components/ui';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import { useThemeColors } from '@/styles/appStyles';

export function extractSessionIdFromLink(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // 1. URL pattern: .../session/<id>
  const urlMatch = trimmed.match(/\/session\/([a-zA-Z0-9_\-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // 2. Custom deep link: nexus://session/<id>
  const deepMatch = trimmed.match(/nexus:\/\/session\/([a-zA-Z0-9_\-]+)/i);
  if (deepMatch && deepMatch[1]) {
    return deepMatch[1];
  }

  // 3. Query param: ?id=... or ?sessionId=... or ?room=...
  const paramMatch = trimmed.match(/[?&](?:id|sessionId|room)=([a-zA-Z0-9_\-]+)/i);
  if (paramMatch && paramMatch[1]) {
    return paramMatch[1];
  }

  // 4. Strip protocols / trailing slashes if URL without /session/
  const clean = trimmed.split('?')[0].split('#')[0].replace(/^https?:\/\//, '').replace(/\/$/, '');
  const segments = clean.split('/');
  return segments[segments.length - 1] || trimmed;
}

export function JoinSessionByLinkCard({
  onJoin,
}: {
  onJoin: (sessionId: string) => void;
}) {
  const [linkInput, setLinkInput] = useState('');
  const colors = useThemeColors();
  const toast = useToast();

  const handlePaste = async () => {
    tapLight();
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setLinkInput(text.trim());
        notifySuccess();
        toast.show('Pasted link from clipboard!', 'info');
      } else {
        toast.show('Clipboard is empty.', 'info');
      }
    } catch {
      toast.show('Could not access clipboard.', 'error');
    }
  };

  const handleJoin = () => {
    if (!linkInput.trim()) {
      toast.show('Please enter a session link or meeting ID.', 'error');
      return;
    }

    const resolvedId = extractSessionIdFromLink(linkInput);
    if (!resolvedId) {
      toast.show('Invalid session link or meeting ID format.', 'error');
      return;
    }

    tapMedium();
    notifySuccess();
    onJoin(resolvedId);
  };

  return (
    <View
      style={[
        joinStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={joinStyles.headerRow}>
        <View style={joinStyles.iconBadge}>
          <Ionicons name="link" size={16} color="#0284C7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
            Join with Link or Meeting ID
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
            Enter or paste an invite link to jump into a live classroom
          </Text>
        </View>
      </View>

      <View style={joinStyles.inputContainer}>
        <View
          style={[
            joinStyles.inputWrapper,
            {
              backgroundColor: colors.isDark ? '#0F172A' : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="link-outline" size={16} color={colors.muted} />
          <TextInput
            placeholder="Paste session link or Meeting ID..."
            placeholderTextColor={colors.muted}
            value={linkInput}
            onChangeText={setLinkInput}
            autoCapitalize="none"
            autoCorrect={false}
            style={[joinStyles.input, { color: colors.text }]}
          />
          {linkInput.length > 0 ? (
            <Pressable
              onPress={() => setLinkInput('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={joinStyles.clearBtn}
            >
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handlePaste}
              style={({ pressed }) => [
                joinStyles.pasteBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="clipboard-outline" size={12} color="#0284C7" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>Paste</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleJoin}
          disabled={!linkInput.trim()}
          style={({ pressed }) => [
            joinStyles.joinBtn,
            !linkInput.trim() && { opacity: 0.5 },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Ionicons name="enter-outline" size={16} color="#FFFFFF" />
          <Text style={joinStyles.joinBtnText}>Join Session</Text>
        </Pressable>
      </View>
    </View>
  );
}

const joinStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 6,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    gap: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearBtn: {
    padding: 2,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
