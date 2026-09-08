import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, View } from 'react-native';

import { AppImage } from '@/components/media';
import {
  EmptyState,
  SkeletonList,
  useRefreshControl,
  useToast,
} from '@/components/feedback';
import { IconButton, Pill, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand } from '@/data/mockData';
import { tapMedium } from '@/lib/haptics';
import { recommendCommunities } from '@/lib/recommendations';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function CommunitiesScreen({
  onOpenDetail,
  onOpenCommunity,
  onCreateCommunity,
}: {
  onOpenDetail?: (communityId?: string) => void;
  onOpenCommunity?: (communityId?: string) => void;
  onCreateCommunity: () => void;
}) {
  const colors = useThemeColors();
  const { communitiesList, toggleJoinCommunity, isLoadingData, profile } = useAppStore();
  const refreshControl = useRefreshControl();
  const toast = useToast();

  const handleToggleJoin = (id: string, name: string, joined: boolean) => {
    tapMedium();
    toggleJoinCommunity(id);
    toast.show(joined ? `Left ${name}` : `Joined ${name}`, joined ? 'info' : 'success');
  };
  const [activeFilter, setActiveFilter] = useState<'all' | 'joined' | 'stem' | 'humanities'>('all');
  // Takes the id explicitly: every detail screen used to open the first
  // community in the list regardless of which card was tapped.
  const handleOpen = (communityId?: string) => {
    (onOpenDetail || onOpenCommunity)?.(communityId);
  };

  const joinedCount = communitiesList.filter((c) => c.joined).length;

  // Was a fixed card reading "Based on active university learning groups" with
  // no matching behind it. Now a tag overlap against the profile, as the PRD
  // specifies for v1 — deliberately not a learned model on sparse data.
  const recommendations = recommendCommunities(profile, communitiesList, 2);

  const filteredCommunities = communitiesList.filter((item) => {
    if (activeFilter === 'joined') return item.joined;
    if (activeFilter === 'stem') {
      const s = (item.subject || '').toLowerCase() + ' ' + (item.name || '').toLowerCase();
      return (
        s.includes('math') ||
        s.includes('physics') ||
        s.includes('computer') ||
        s.includes('stem') ||
        s.includes('engineering') ||
        s.includes('algo') ||
        s.includes('science')
      );
    }
    if (activeFilter === 'humanities') {
      const s = (item.subject || '').toLowerCase() + ' ' + (item.name || '').toLowerCase();
      return (
        s.includes('literature') ||
        s.includes('history') ||
        s.includes('philosophy') ||
        s.includes('arts') ||
        s.includes('humanities') ||
        s.includes('language') ||
        s.includes('writing')
      );
    }
    return true;
  });

  return (
    <View style={[styles.flexFill, styles.screenContent]}>
      <FlatList
        data={filteredCommunities}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.screenHeaderRow}>
              <Text style={styles.screenTitle}>Communities</Text>
              <IconButton icon="add" onPress={onCreateCommunity} filled />
            </View>

            {communitiesList.length > 0 ? (
              <View style={styles.filterPillsRow}>
                <Pill
                  label={`All (${communitiesList.length})`}
                  active={activeFilter === 'all'}
                  onPress={() => setActiveFilter('all')}
                />
                <Pill
                  label={`Joined (${joinedCount})`}
                  active={activeFilter === 'joined'}
                  onPress={() => setActiveFilter('joined')}
                />
                <Pill
                  label="STEM"
                  active={activeFilter === 'stem'}
                  onPress={() => setActiveFilter('stem')}
                />
                <Pill
                  label="Humanities"
                  active={activeFilter === 'humanities'}
                  onPress={() => setActiveFilter('humanities')}
                />
              </View>
            ) : null}

            {recommendations.map(({ community, reason }) => (
              <Pressable
                key={community.id}
                onPress={() => handleOpen(community.id)}
                accessibilityRole="button"
                accessibilityLabel={`Recommended: ${community.name}. ${reason}`}
                style={({ pressed }) => [styles.recommendedCard, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.recommendedIcon}>
                  <Ionicons name="sparkles" size={16} color={brand.primary} />
                </View>
                <View style={styles.flexFill}>
                  <Text style={styles.recommendedTitle}>{community.name}</Text>
                  <Text style={styles.mutedCopySmall}>{reason}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        }
        ListEmptyComponent={
          isLoadingData ? (
            <SkeletonList count={4} />
          ) : (
            <EmptyState
              icon="people-outline"
              title={activeFilter === 'all' ? 'No communities yet' : `No ${activeFilter} communities yet`}
              message="Start a community for your course and invite your classmates."
              actionLabel="Create a community"
              onAction={onCreateCommunity}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.largeCommunityCard}>
            <Pressable
              hitSlop={HIT_SLOP}
              onPress={() => handleOpen(item.id)}
              style={({ pressed }) => [pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] }]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`View community ${item.name}`}
            >
              <AppImage source={{ uri: item.image }} style={styles.largeCommunityImage} />
            </Pressable>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <View style={styles.flexFill}>
                  <Text style={styles.communityName}>{item.name}</Text>
                  <Text style={styles.mutedCopySmall}>
                    {item.members} members · {item.posts} posts this week
                  </Text>
                </View>
                {!item.joined && (
                <Pressable
                  hitSlop={HIT_SLOP}
                  onPress={() => handleToggleJoin(item.id, item.name, false)}
                  style={({ pressed }) => [
                    styles.primarySmallButton,
                    pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Join ${item.name}`}
                >
                  <Text style={styles.primarySmallText}>Join</Text>
                </Pressable>
                )}
              </View>
              <Text style={styles.mutedCopySmall}>{item.description}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
