import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';

import { LobbyChatMessage } from './types';

/** The slide-up chat drawer inside a live session. */
export function InMeetingChatModal({
  visible,
  messages,
  draft,
  onChangeDraft,
  onSend,
  onClose,
}: {
  visible: boolean;
  messages: LobbyChatMessage[];
  draft: string;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ height: '70%', backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>In-Meeting Live Chat</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1, marginBottom: 12 }}>
            {messages.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="chatbox-ellipses-outline" size={36} color="#6B7280" />
                <Text style={{ color: '#9CA3AF', marginTop: 8, fontSize: 13, textAlign: 'center' }}>
                  No messages yet. Send a live message to everyone in this meeting!
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View key={msg.id} style={{ marginBottom: 12, backgroundColor: '#1F2937', padding: 10, borderRadius: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#38BDF8', fontWeight: '700', fontSize: 13 }}>{msg.sender}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 10 }}>{msg.time}</Text>
                  </View>
                  <Text style={{ color: '#F3F4F6', fontSize: 13 }}>{msg.text}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={draft}
              onChangeText={onChangeDraft}
              placeholder="Type a message to everyone..."
              placeholderTextColor="#6B7280"
              style={{
                flex: 1,
                backgroundColor: '#1F2937',
                color: '#FFFFFF',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
              }}
              onSubmitEditing={onSend}
            />
            <Pressable
              onPress={onSend}
              style={{ backgroundColor: '#3B82F6', padding: 12, borderRadius: 12 }}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
