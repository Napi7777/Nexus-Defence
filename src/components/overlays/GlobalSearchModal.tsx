import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AppRoute, useAppStore } from '@/context/AppStoreContext';
import { UserProfile } from '@/data/mockData';
import { fetchAllProfiles } from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';

// SRS 3.11 also lists "Courses" as a searchable entity. This app has no
// separate course catalog — a Community already carries a `subject` field and
// is how students discover and join a course of study together, so
// Communities doubles as Courses here rather than adding a parallel category
// that would just search the same rows a second time.
export type SearchEntity = 'All' | 'Communities' | 'Sessions' | 'Meetups' | 'Tutors';

export function GlobalSearchModal({
  visible,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
}) {
  const { communitiesList, sessionsList, meetupsList, profile } = useAppStore();
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<SearchEntity>('All');

  // Real registered members/tutors, fetched once when the modal opens and
  // filtered client-side as the user types — this used to filter
  // `sampleLeaderboard`, a hardcoded mock array, instead of anyone who
  // actually signed up.
  const [tutorProfiles, setTutorProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    fetchAllProfiles(profile.id).then((profiles) => {
      if (active) setTutorProfiles(profiles);
    });
    return () => {
      active = false;
    };
  }, [visible, profile.id]);

  if (!visible) return null;

  const entityFilters: SearchEntity[] = ['All', 'Communities', 'Sessions', 'Meetups', 'Tutors'];

  // 1. Filter Communities
  const matchedCommunities = (selectedEntity === 'All' || selectedEntity === 'Communities')
    ? communitiesList.filter((c) =>
        !query.trim() || c.name.toLowerCase().includes(query.toLowerCase()) || c.subject.toLowerCase().includes(query.toLowerCase())
      ).map((c) => ({
        id: `comm-${c.id}`,
        title: c.name,
        subtitle: `Community · ${c.subject}`,
        type: 'Communities' as const,
        image: c.image,
        route: 'main-communities' as AppRoute,
      }))
    : [];

  // 2. Filter Sessions
  const matchedSessions = (selectedEntity === 'All' || selectedEntity === 'Sessions')
    ? sessionsList.filter((s) =>
        !query.trim() || s.title.toLowerCase().includes(query.toLowerCase()) || s.tag.toLowerCase().includes(query.toLowerCase())
      ).map((s) => ({
        id: `sess-${s.id}`,
        title: s.title,
        subtitle: `Tutoring Session · ${s.tag}`,
        type: 'Sessions' as const,
        image: s.image,
        route: 'main-sessions' as AppRoute,
      }))
    : [];

  // 3. Filter Campus Meetups
  const matchedMeetups = (selectedEntity === 'All' || selectedEntity === 'Meetups')
    ? meetupsList.filter((m) =>
        !query.trim() || m.title.toLowerCase().includes(query.toLowerCase()) || m.location.toLowerCase().includes(query.toLowerCase())
      ).map((m) => ({
        id: `meet-${m.id}`,
        title: m.title,
        subtitle: `In-Person Meetup · ${m.location}`,
        type: 'Meetups' as const,
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80',
        route: 'main-sessions' as AppRoute,
      }))
    : [];

  // 4. Filter Tutors & registered members — real profiles fetched from
  // Supabase on open, matched against name (plus declared skills/interests so
  // e.g. "Calculus" surfaces a tutor who lists it as a skill).
  const matchedTutors = (selectedEntity === 'All' || selectedEntity === 'Tutors')
    ? tutorProfiles.filter((t) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.skills.some((skill) => skill.toLowerCase().includes(q)) ||
          t.interests.some((interest) => interest.toLowerCase().includes(q))
        );
      }).map((t, idx) => ({
        id: `tut-${t.id || idx}`,
        title: t.name,
        subtitle: `${t.skillLevel} Tutor · ${t.skills.slice(0, 2).join(', ') || t.major}`,
        type: 'Tutors' as const,
        image: t.avatar,
        route: 'leaderboard' as AppRoute,
      }))
    : [];

  const allResults = [
    ...matchedCommunities,
    ...matchedSessions,
    ...matchedMeetups,
    ...matchedTutors,
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.globalSearchBackdrop}>
        <View style={[styles.globalSearchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Top Query Input Row */}
          <View style={[styles.globalSearchInputRow, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Instant search across NEXUS..."
              placeholderTextColor={colors.muted}
              style={[styles.globalSearchInput, { color: colors.text }]}
              autoFocus
            />
            {query ? (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {/* Entity Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {entityFilters.map((entity) => (
              <Pressable
                key={entity}
                onPress={() => setSelectedEntity(entity)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Filter search results by ${entity}`}
              >
                <Pill label={entity} active={selectedEntity === entity} compact />
              </Pressable>
            ))}
          </ScrollView>

          {/* Results List */}
          <Text style={[styles.mutedCopySmall, { color: colors.muted }]}>Found {allResults.length} campus results</Text>
          {allResults.length === 0 ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={32} color={colors.muted} />
              <Text style={[styles.mutedCopy, { color: colors.muted, marginTop: 8 }]}>No matching campus resources found.</Text>
            </View>
          ) : (
            <FlatList
              data={allResults}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onClose();
                    onNavigate(item.route);
                  }}
                  style={[styles.searchResultRow, { borderBottomColor: colors.border }]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}, ${item.subtitle}`}
                >
                  <Avatar source={item.image} size={42} />
                  <View style={styles.flexFill}>
                    <Text style={[styles.communityName, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.mutedCopySmall, { color: colors.muted }]} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <View style={[styles.entityBadge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.entityBadgeText, { color: colors.text }]}>{item.type}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}

          <Pressable onPress={onClose} style={[styles.primaryButton, { backgroundColor: colors.inputBg, marginTop: 6 }]}>
            <Text style={[styles.primaryButtonText, { color: colors.text }]}>Close Search</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
