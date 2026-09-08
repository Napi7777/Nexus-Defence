import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Text } from '@/components/ui';

import { LobbyParticipant } from './types';

/** Full-screen roster for a live session: search, host controls, per-peer state. */
export function ParticipantsModal({
  visible,
  participants,
  filtered,
  search,
  onChangeSearch,
  isMutedAll,
  onMuteAll,
  spotlightedId,
  onSpotlightParticipant,
  onLowerHand,
  onClose,
}: {
  visible: boolean;
  participants: LobbyParticipant[];
  filtered: LobbyParticipant[];
  search: string;
  onChangeSearch: (value: string) => void;
  isMutedAll: boolean;
  onMuteAll: () => void;
  spotlightedId?: string;
  onSpotlightParticipant?: (id: string) => void;
  onLowerHand?: (id: string) => void;
  onClose: () => void;
}) {
  const raisedHands = participants.filter((p) => p.isHandRaised);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
              Participants ({participants.length})
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
              {raisedHands.length > 0 ? `${raisedHands.length} hand(s) raised` : 'All quiet'}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Roster Controls Bar */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable
            onPress={onMuteAll}
            style={{
              flex: 1,
              backgroundColor: isMutedAll ? '#EF4444' : '#374151',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
              {isMutedAll ? 'Unmute All' : 'Mute All'}
            </Text>
          </Pressable>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: '#3B82F6',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Invite Link</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <TextInput
            value={search}
            onChangeText={onChangeSearch}
            placeholder="Search participant..."
            placeholderTextColor="#6B7280"
            style={{
              backgroundColor: '#1F2937',
              color: '#FFFFFF',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {/* Raised Hands Queue */}
          {raisedHands.length > 0 && !search ? (
            <View
              style={{
                backgroundColor: 'rgba(249,115,22,0.12)',
                borderColor: '#F97316',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="hand-left" size={16} color="#F97316" />
                <Text style={{ color: '#FB923C', fontSize: 13, fontWeight: '700' }}>
                  Raised Hands Queue ({raisedHands.length})
                </Text>
              </View>

              {raisedHands.map((p) => (
                <View
                  key={`hand-${p.id}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Avatar source={p.avatar} size={32} />
                    <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 }}>
                      {p.name}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {onSpotlightParticipant ? (
                      <Pressable
                        onPress={() => onSpotlightParticipant(p.id)}
                        style={{
                          backgroundColor: '#3B82F6',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Call On</Text>
                      </Pressable>
                    ) : null}

                    {onLowerHand ? (
                      <Pressable
                        onPress={() => onLowerHand(p.id)}
                        style={{
                          backgroundColor: '#374151',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#D1D5DB', fontSize: 11 }}>Lower</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Regular Roster */}
          {filtered.map((p) => {
            const isSpotlighted = spotlightedId === p.id;
            return (
              <View
                key={p.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#1F2937',
                }}
              >
                <Avatar source={p.avatar} size={42} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{p.name}</Text>
                    {isSpotlighted ? (
                      <View
                        style={{
                          backgroundColor: '#F59E0B',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#000000', fontSize: 9, fontWeight: '800' }}>SPOTLIGHT</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{p.role}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {p.isHandRaised ? <Ionicons name="hand-left" size={16} color="#F97316" /> : null}

                  {onSpotlightParticipant && (
                    <Pressable
                      onPress={() => onSpotlightParticipant(p.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={isSpotlighted ? 'star' : 'star-outline'}
                        size={18}
                        color={isSpotlighted ? '#F59E0B' : '#6B7280'}
                      />
                    </Pressable>
                  )}

                  <Ionicons
                    name={p.isMuted ? 'mic-off' : 'mic'}
                    size={18}
                    color={p.isMuted ? '#EF4444' : '#10B981'}
                  />
                  <Ionicons
                    name={p.isCameraOn ? 'videocam' : 'videocam-off'}
                    size={18}
                    color={p.isCameraOn ? '#10B981' : '#EF4444'}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
