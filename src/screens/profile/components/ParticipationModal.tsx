import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { EmptyState, SkeletonList } from '@/components/feedback';
import { SessionItem } from '@/data/mockData';
import { getSessionParticipation } from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';

/** Formats a timestamp the same way the rest of the app renders "time ago". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

type Participant = {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string;
  minutes: number;
};

/**
 * Tutor-side "who attended this session" view (SRS 3.9). Reads
 * getSessionParticipation for whichever hosted session the tutor tapped.
 */
export function ParticipationModal({
  session,
  visible,
  onClose,
}: {
  session: SessionItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !session) return;
    let active = true;
    setLoading(true);
    getSessionParticipation(session.id).then((rows) => {
      if (active) {
        setParticipants(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [visible, session?.id]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flexFill}>
              <Text style={styles.modalTitle}>Participation</Text>
              <Text style={styles.mutedCopySmall} numberOfLines={1}>
                {session?.title}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {loading ? (
              <SkeletonList count={3} lines={1} />
            ) : participants.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No attendance yet"
                message="Once students join this session, they'll show up here with when they joined and how long they stayed."
                compact
              />
            ) : (
              participants.map((p) => (
                <View key={p.id} style={styles.attendanceRow}>
                  <Avatar source={p.avatar} size={38} />
                  <View style={styles.flexFill}>
                    <Text style={styles.communityName}>{p.name}</Text>
                    <Text style={styles.mutedCopySmall}>
                      Joined {relativeTime(p.joinedAt)} · {p.minutes > 0 ? `${p.minutes} min` : '< 1 min'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
