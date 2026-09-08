/** Member management for community owners and tutors (SRS 3.3). */
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, SkeletonList, useToast } from '@/components/feedback';
import { Avatar, HeaderBar, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, CommunityItem } from '@/data/mockData';
import { tapLight } from '@/lib/haptics';
import {
  CommunityMember,
  getCommunityMembers,
  removeCommunityMember,
  setCommunityMemberRole,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { modStyles } from './moderationStyles';

export function CommunityMembersScreen({
  community,
  onBack,
}: {
  community: CommunityItem;
  onBack: () => void;
}) {
  const colors = useThemeColors();
  const toast = useToast();
  const { profile } = useAppStore();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCommunityMembers(community.id).then((rows) => {
      if (!active) return;
      setMembers(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [community.id]);

  const handleRemove = async (member: CommunityMember) => {
    if (busyId) return;
    setBusyId(member.id);
    try {
      const { error } = await removeCommunityMember(community.id, member.id);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.show(`Removed ${member.name}`, 'info');
    } catch (err: any) {
      // Only the community owner may remove members; the policy enforces it.
      toast.show(err?.message || 'You do not have permission to remove members.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleRole = async (member: CommunityMember) => {
    if (busyId) return;
    const next = member.role === 'moderator' ? 'member' : 'moderator';
    setBusyId(member.id);
    try {
      const { error } = await setCommunityMemberRole(community.id, member.id, next);
      if (error) throw error;
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: next } : m)));
      tapLight();
      toast.show(next === 'moderator' ? `${member.name} is now a moderator` : `${member.name} is now a member`);
    } catch (err: any) {
      toast.show(err?.message || 'You do not have permission to change roles.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.lightScreen, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <HeaderBar title="Members" onBack={onBack} />
        <Text style={styles.sectionSubline}>{community.name}</Text>

        {loading ? (
          <SkeletonList count={4} lines={1} />
        ) : members.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No members yet"
            message="Share this community with your classmates to get started."
          />
        ) : (
          members.map((member) => {
            const isSelf = member.id === profile.id;
            return (
              <View
                key={member.id}
                style={[
                  modStyles.memberRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Avatar source={member.avatar} size={40} />
                <View style={styles.flexFill}>
                  <Text style={[modStyles.memberName, { color: colors.text }]}>
                    {member.name}
                    {isSelf ? ' (You)' : ''}
                  </Text>
                  <Text style={[modStyles.memberMeta, { color: colors.muted }]}>
                    {member.role === 'moderator' ? 'Moderator' : 'Member'} · joined{' '}
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </Text>
                </View>

                {isSelf ? null : (
                  <View style={modStyles.memberActions}>
                    <Pressable
                      onPress={() => handleToggleRole(member)}
                      disabled={busyId === member.id}
                      accessibilityRole="button"
                      accessibilityLabel={
                        member.role === 'moderator'
                          ? `Demote ${member.name} to member`
                          : `Promote ${member.name} to moderator`
                      }
                      style={({ pressed }) => [modStyles.iconAction, pressed && { opacity: 0.6 }]}
                    >
                      <Ionicons
                        name={member.role === 'moderator' ? 'shield' : 'shield-outline'}
                        size={20}
                        color={member.role === 'moderator' ? brand.primary : colors.muted}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() => handleRemove(member)}
                      disabled={busyId === member.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${member.name} from this community`}
                      style={({ pressed }) => [modStyles.iconAction, pressed && { opacity: 0.6 }]}
                    >
                      <Ionicons name="person-remove-outline" size={20} color={brand.danger} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
