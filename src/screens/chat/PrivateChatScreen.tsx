import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback';
import { Avatar, CircleIconButton, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, MessageItem } from '@/data/mockData';
import { tapMedium } from '@/lib/haptics';
import {
  getMessages,
  sendSupabaseMessage,
  subscribeToThreadMessages,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function PrivateChatScreen({
  onBack,
  threadId,
}: {
  onBack: () => void;
  threadId: string;
}) {
  const { threads, messagesByThread, sendMessage, profile } = useAppStore();
  const [draft, setDraft] = useState('');
  const colors = useThemeColors();
  const toast = useToast();
  const [liveMessages, setLiveMessages] = useState<MessageItem[]>(
    messagesByThread[threadId] || []
  );
  const flatListRef = useRef<FlatList<MessageItem>>(null);

  const activeThread = threads.find((item) => item.id === threadId) || {
    id: threadId,
    name: 'Live Chat',
    preview: '',
    time: 'Now',
    avatar: 'https://i.pravatar.cc/120?u=chat',
    online: true,
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initRealtimeChat() {
      const activeUserId = profile?.id || 'user-me';

      // Fetch message history from Supabase
      const history = await getMessages(threadId, activeUserId);
      if (history && history.length > 0) {
        setLiveMessages(history);
      }

      // Subscribe to live WebSocket messages for threadId
      unsubscribe = subscribeToThreadMessages(
        threadId,
        (newMsg) => {
          setLiveMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || (m.text === newMsg.text && m.sender === 'me'))) {
              return prev;
            }
            return [...prev, newMsg];
          });
          flatListRef.current?.scrollToEnd({ animated: true });
        },
        activeUserId
      );
    }

    initRealtimeChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [threadId, profile.id]);


  const handleSend = async () => {
    if (!draft.trim()) return;

    const textToSend = draft.trim();
    setDraft('');

    // Optimistic UI addition
    const newMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    sendMessage(activeThread.id, textToSend);
    setLiveMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Send to Supabase live channel
    try {
      await sendSupabaseMessage(threadId, textToSend, profile?.id);
    } catch (err) {
      console.warn('Realtime message send error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatHeader}>
          <Pressable
            onPress={onBack}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Avatar source={activeThread.avatar} size={38} />
          <View style={styles.flexFill}>
            <Text style={styles.threadName}>{activeThread.name}</Text>
            <Text style={styles.onlineText}>Live Realtime Online</Text>
          </View>
          <CircleIconButton icon="information-circle-outline" onPress={onBack} />
        </View>

        <FlatList
          ref={flatListRef}
          data={liveMessages}
          keyExtractor={(item) => item.id}
          style={styles.flexFill}
          contentContainerStyle={styles.chatMessages}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={<Text style={styles.chatDayMarker}>Live Chat Session</Text>}
          renderItem={({ item: message }) => (
            <View
              style={[
                styles.messageBubble,
                message.sender === 'me' ? styles.messageBubbleMine : styles.messageBubbleTheirs,
              ]}
              accessible={true}
              accessibilityLabel={`Message: ${message.text} at ${message.time}`}
            >
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'me' ? styles.messageTextMine : undefined,
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.sender === 'me' ? styles.messageTimeMine : undefined,
                ]}
              >
                {message.time}
              </Text>
            </View>
          )}
        />

        <View style={styles.chatComposer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            style={styles.composerInput}
            onSubmitEditing={handleSend}
          />
          <CircleIconButton icon="send" onPress={handleSend} filled label="Send message" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
