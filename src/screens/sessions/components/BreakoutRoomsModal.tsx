import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Text } from '@/components/ui';
import { DEFAULT_AVATAR } from '@/data/mockData';
import { notifySuccess, tapMedium } from '@/lib/haptics';

export type BreakoutPod = {
  id: string;
  name: string;
  topic: string;
  members: { id: string; name: string; avatar: string }[];
  maxCapacity: number;
};

const INITIAL_PODS: BreakoutPod[] = [
  {
    id: 'pod-1',
    name: 'Pod 1 · Pair Problem Solving',
    topic: 'Collaborative Problem Solving & Exercises',
    members: [],
    maxCapacity: 4,
  },
  {
    id: 'pod-2',
    name: 'Pod 2 · Code Review & Debugging',
    topic: 'Peer Review & Algorithm Discussion',
    members: [],
    maxCapacity: 4,
  },
  {
    id: 'pod-3',
    name: 'Pod 3 · 1-on-1 Help with Tutor',
    topic: 'Open Q&A with Session Host',
    members: [],
    maxCapacity: 2,
  },
];

export function BreakoutRoomsModal({
  visible,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  activePodId,
  onJoinPod,
  onLeavePod,
}: {
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  activePodId: string | null;
  onJoinPod: (podId: string) => void;
  onLeavePod: () => void;
}) {
  const [pods, setPods] = useState<BreakoutPod[]>(INITIAL_PODS);
  const [remainingSec, setRemainingSec] = useState(900); // 15 min breakout timer
  const [helpRequested, setHelpRequested] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (visible) {
      timer = setInterval(() => {
        setRemainingSec((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectPod = (podId: string) => {
    tapMedium();
    notifySuccess();
    onJoinPod(podId);
    onClose();
  };

  const handleAskHelp = () => {
    setHelpRequested(true);
    notifySuccess();
    setTimeout(() => setHelpRequested(false), 8000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.95)' }}>
        <View style={podStyles.container}>
          {/* Top Header */}
          <View style={podStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={podStyles.badgeIcon}>
                <Ionicons name="git-branch" size={16} color="#34D399" />
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  Breakout Study Pods 👥
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                  Small group collaboration & 1-on-1 tutoring
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={podStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Breakout Timer & Status Banner */}
          <View style={podStyles.timerBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={16} color="#34D399" />
              <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>
                Pod Session Time Remaining:
              </Text>
            </View>
            <View style={podStyles.timerChip}>
              <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '800', fontFamily: 'monospace' }}>
                {formatTimer(remainingSec)}
              </Text>
            </View>
          </View>

          {/* Active Pod Status Banner if inside a Pod */}
          {activePodId ? (
            <View style={podStyles.currentPodCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    You are in Pod {activePodId.replace('pod-', '')}
                  </Text>
                  <Text style={{ color: '#93C5FD', fontSize: 11 }}>Collaborating with peers</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={handleAskHelp}
                    style={[
                      podStyles.askHelpBtn,
                      helpRequested && { backgroundColor: '#059669' },
                    ]}
                  >
                    <Ionicons name={helpRequested ? 'checkmark' : 'help-buoy'} size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                      {helpRequested ? 'Tutor Notified!' : 'Ask Host for Help'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      onLeavePod();
                      onClose();
                    }}
                    style={podStyles.leavePodBtn}
                  >
                    <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '700' }}>
                      Back to Main
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {/* Pods List */}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {pods.map((pod) => {
              const isUserInThisPod = activePodId === pod.id;
              const isFull = pod.members.length >= pod.maxCapacity;

              return (
                <View
                  key={pod.id}
                  style={[
                    podStyles.podCard,
                    isUserInThisPod && podStyles.podCardActive,
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                        {pod.name}
                      </Text>
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                        {pod.topic}
                      </Text>
                    </View>

                    <View style={podStyles.capacityBadge}>
                      <Ionicons name="people" size={12} color="#94A3B8" />
                      <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700' }}>
                        {pod.members.length}/{pod.maxCapacity}
                      </Text>
                    </View>
                  </View>

                  {/* Members Avatars Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <View style={{ flexDirection: 'row' }}>
                      {pod.members.map((m, idx) => (
                        <View key={m.id} style={{ marginLeft: idx > 0 ? -10 : 0 }}>
                          <Avatar source={m.avatar || DEFAULT_AVATAR} size={28} />
                        </View>
                      ))}
                    </View>
                    <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                      {pod.members.map((m) => m.name.split(' ')[0]).join(', ')}
                    </Text>
                  </View>

                  {/* Join Action */}
                  <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end' }}>
                    {isUserInThisPod ? (
                      <View style={podStyles.inPodChip}>
                        <Ionicons name="radio-button-on" size={12} color="#34D399" />
                        <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '700' }}>
                          Current Pod
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        disabled={isFull}
                        onPress={() => handleSelectPod(pod.id)}
                        style={({ pressed }) => [
                          podStyles.joinPodBtn,
                          isFull && { opacity: 0.5, backgroundColor: '#334155' },
                          pressed && !isFull && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                          {isFull ? 'Pod Full' : 'Join Breakout Pod →'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const podStyles = StyleSheet.create({
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
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  timerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  timerChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentPodCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  askHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  leavePodBtn: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  podCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  podCardActive: {
    borderColor: '#34D399',
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inPodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinPodBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
