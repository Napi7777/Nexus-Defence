import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, useRefreshControl } from '@/components/feedback';
import { Avatar, IconButton, SearchInput, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, ThreadPreview, UserProfile } from '@/data/mockData';
import {
  fetchAllProfiles,
  getOrCreateDirectThread,
  getUserThreads,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function ChatListScreen({
  onOpenThread,
  onSelectThread,
}: {
  onOpenThread: (threadId?: string) => void;
  onSelectThread?: (threadId: string) => void;
}) {
  const colors = useThemeColors();
  const { threads, profile } = useAppStore();
  const refreshControl = useRefreshControl();
  const [liveThreads, setLiveThreads] = useState<ThreadPreview[]>(threads);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadThreads = async () => {
    if (profile?.id) {
      const supThreads = await getUserThreads(profile.id);
      if (supThreads && supThreads.length > 0) {
        setLiveThreads(supThreads);
      }
    }
  };

  useEffect(() => {
    setLiveThreads(threads);
    loadThreads();
  }, [threads, profile.id]);

  const handleOpenNewChatModal = async () => {
    setShowNewChatModal(true);
    setLoadingUsers(true);
    const users = await fetchAllProfiles(profile.id);
    setUserList(users);
    setLoadingUsers(false);
  };

  const handleSelectUserToChat = async (user: UserProfile) => {
    setShowNewChatModal(false);
    const targetThread = await getOrCreateDirectThread(profile.id || 'user-1', user);
    setLiveThreads((prev) => {
      if (prev.some((t) => t.id === targetThread.id)) return prev;
      return [targetThread, ...prev];
    });
    if (onSelectThread) {
      onSelectThread(targetThread.id);
    } else {
      onOpenThread(targetThread.id);
    }
  };

  const filteredUsers = userList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.university.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayThreads = liveThreads.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.flexFill, styles.screenContent]}>
      <View style={styles.screenHeaderRow}>
        <Text style={styles.screenTitle}>Messages</Text>
        <IconButton icon="add" onPress={handleOpenNewChatModal} filled />
      </View>
      <SearchInput
        placeholder="Search conversations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {displayThreads.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#EEF2FF',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={32} color={brand.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
            No Conversations Yet
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 20 }}>
            Start a live real-time chat with another registered student or tutor!
          </Text>
          <Pressable
            hitSlop={HIT_SLOP}
            onPress={handleOpenNewChatModal}
            style={({ pressed }) => [
              {
                backgroundColor: brand.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>+ Start New Live Chat</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayThreads}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="Start a chat with a peer or tutor and it will show up here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              hitSlop={HIT_SLOP}
              onPress={() => {
                if (onSelectThread) {
                  onSelectThread(item.id);
                } else {
                  onOpenThread(item.id);
                }
              }}
              style={({ pressed }) => [styles.threadRow, pressed && { opacity: 0.75, backgroundColor: '#F4F2EE' }]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Chat thread with ${item.name}, ${item.preview}`}
            >
              <Avatar source={item.avatar} size={44} />
              <View style={styles.flexFill}>
                <View style={styles.threadTop}>
                  <Text style={styles.threadName}>{item.name}</Text>
                  <Text style={styles.threadTime}>{item.time}</Text>
                </View>
                <Text numberOfLines={1} style={styles.threadPreview}>
                  {item.preview}
                </Text>
              </View>
              {item.unread ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}

      {/* New Chat Modal */}
      <Modal visible={showNewChatModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: brand.border,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>New Live Chat</Text>
            <Pressable hitSlop={HIT_SLOP} onPress={() => setShowNewChatModal(false)} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.6 }]}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <SearchInput
              placeholder="Search registered members..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loadingUsers ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={brand.primary} />
              <Text style={{ marginTop: 12, color: colors.muted }}>Loading registered members...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text style={{ marginTop: 12, fontSize: 16, color: colors.muted, textAlign: 'center' }}>
                No other registered users found. Sign up a second account to test live messaging!
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id || item.email}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <Pressable
                  hitSlop={HIT_SLOP}
                  onPress={() => handleSelectUserToChat(item)}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: brand.border,
                    },
                    pressed && { opacity: 0.7, backgroundColor: '#F8F9FA' },
                  ]}
                >
                  <Avatar source={item.avatar} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.name}</Text>
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      {item.major} · {item.university}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
