import { useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { EmptyState, useRefreshControl, useToast } from '@/components/feedback';
import {
  Avatar,
  GhostSmallButton,
  IconButton,
  Pill,
  PrimarySmallButton,
  Text,
} from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, InPersonMeetup, liveSession } from '@/data/mockData';
import { tapMedium } from '@/lib/haptics';
import { recommendSessions } from '@/lib/recommendations';
import { styles, useThemeColors } from '@/styles/appStyles';

import { KNUSTMapModal } from './components/KNUSTMapModal';
import { JoinSessionByLinkCard } from './components/JoinSessionByLinkCard';

export function SessionsScreen({
  onOpenFilters,
  onOpenSchedule,
  onOpenCreateMeetup,
  onOpenLiveSession,
}: {
  onOpenFilters: () => void;
  onOpenSchedule: () => void;
  onOpenCreateMeetup: () => void;
  onOpenLiveSession: (sessionId?: string) => void;
}) {
  const colors = useThemeColors();
  const { sessionsList, meetupsList, toggleRSVPMeetup, selectedFilters, profile } = useAppStore();
  const [selectedMeetupMap, setSelectedMeetupMap] = useState<InPersonMeetup | null>(null);
  const refreshControl = useRefreshControl();
  const toast = useToast();

  // Was never surfaced anywhere — a tag overlap against the profile's
  // interests/skills, same scoring as the "Recommended for you" communities
  // section (SRS 3.4).
  const sessionRecommendations = recommendSessions(profile, sessionsList, 3);

  // The filters screen collected these and never applied them to anything.
  // Subject chips map onto a session's tag.
  const subjectFilters = selectedFilters.subject;
  const visibleSessions = subjectFilters.length
    ? sessionsList.filter((s) =>
        subjectFilters.some((subject) =>
          (s.tag || '').toLowerCase().includes(subject.toLowerCase())
        )
      )
    : sessionsList;

  /**
   * Opens the meetup location in the device's maps app.
   *
   * An embedded map needs a Google Maps API key on Android; this needs nothing
   * and also covers the SRS's optional "directions" bonus, since the maps app
   * routes from the user's current position.
   */
  const handleOpenInMaps = async (meetup: InPersonMeetup) => {
    const query = encodeURIComponent(meetup.location);
    const url = Platform.select({
      ios: `maps://?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    })!;

    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(
        supported ? url : `https://www.google.com/maps/search/?api=1&query=${query}`
      );
    } catch {
      toast.show('Could not open Maps on this device.', 'error');
    }
  };

  const handleRSVP = (meetup: InPersonMeetup) => {
    tapMedium();
    toggleRSVPMeetup(meetup.id);
    toast.show(
      meetup.rsvpStatus ? `Cancelled RSVP for ${meetup.title}` : `You're going to ${meetup.title}`,
      meetup.rsvpStatus ? 'info' : 'success'
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenContent}
      refreshControl={refreshControl}
    >
      <View style={styles.screenHeaderRow}>
        <Text style={styles.screenTitle}>Sessions & Meetups</Text>
        <IconButton icon="options-outline" onPress={onOpenFilters} />
      </View>

      {/* Live Classroom Lobby Hero */}
      <View style={styles.liveHeroCard}>
        <Text style={styles.liveHeroLabel}>Virtual Classroom</Text>
        <Text style={styles.liveHeroTitle}>
          {sessionsList.find((s) => s.isLive)?.title || (profile.name ? `${profile.name}'s Live Study Room` : 'Interactive Live Peer Room')}
        </Text>
        <Text style={styles.liveHeroMeta}>
          {sessionsList.find((s) => s.isLive)?.participants || 'Live Video · Whiteboard · Polls · Breakouts'}
        </Text>
        <View style={styles.buttonRow}>
          <PrimarySmallButton label="Enter Live Room" onPress={() => onOpenLiveSession(sessionsList.find((s) => s.isLive)?.id)} />
          <GhostSmallButton label="+ Schedule Live" onPress={onOpenSchedule} />
        </View>
      </View>

      {/* Join Live Session via Shared Link or Meeting ID */}
      <JoinSessionByLinkCard onJoin={(sessionId) => onOpenLiveSession(sessionId)} />

      <View style={{ marginVertical: 8 }}>
        <Pressable onPress={onOpenCreateMeetup} style={[{ backgroundColor: '#EBF7EE', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#CDECD4', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#2F8B4E' }}>+ Create Campus Meetup</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Organize in-person peer study at campus library or study halls</Text>
          </View>
          <Ionicons name="location-outline" size={20} color="#2F8B4E" />
        </Pressable>
      </View>

      {sessionRecommendations.length > 0 ? (
        <>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Recommended Sessions</Text>
          </View>
          {sessionRecommendations.map(({ session, reason }) => (
            <Pressable
              key={session.id}
              onPress={() => onOpenLiveSession(session.id)}
              accessibilityRole="button"
              accessibilityLabel={`Recommended: ${session.title}. ${reason}`}
              style={({ pressed }) => [styles.recommendedCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.recommendedIcon}>
                <Ionicons name="sparkles" size={16} color={brand.primary} />
              </View>
              <View style={styles.flexFill}>
                <Text style={styles.recommendedTitle}>{session.title}</Text>
                <Text style={styles.mutedCopySmall}>{reason}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </>
      ) : null}

      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>Scheduled Live Sessions</Text>
      </View>
      {visibleSessions.length === 0 ? (
        <EmptyState
          icon={sessionsList.length === 0 ? 'calendar-outline' : 'funnel-outline'}
          title={sessionsList.length === 0 ? 'No scheduled sessions' : 'No sessions match your filters'}
          message={
            sessionsList.length === 0
              ? "No live sessions have been scheduled yet. Tap '+ Schedule Live' to create one!"
              : 'Clear a filter or two to see more scheduled sessions.'
          }
          actionLabel={sessionsList.length === 0 ? '+ Schedule Live' : undefined}
          onAction={sessionsList.length === 0 ? onOpenSchedule : undefined}
          compact
        />
      ) : null}
      {visibleSessions.map((session) => (
        <Pressable
          key={session.id}
          onPress={() => onOpenLiveSession(session.id)}
          style={({ pressed }) => [styles.sessionListCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.sessionListTop}>
            <Avatar source={session.image} size={42} />
            <View style={styles.flexFill}>
              <Text style={styles.communityName}>{session.title}</Text>
              <Text style={styles.mutedCopySmall}>Tutor: {session.tutor}</Text>
            </View>
            <Pill label={session.tag} compact />
          </View>
          <Text style={styles.sessionTime}>{session.time}</Text>
          <Text style={styles.mutedCopySmall}>{session.participants}</Text>
        </Pressable>
      ))}

      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>In-Person Campus Meetups</Text>
      </View>
      {meetupsList.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="No campus meetups yet"
          message="No in-person campus study meetups organized yet. Tap '+ Create Campus Meetup' above to schedule one!"
          actionLabel="+ Create Campus Meetup"
          onAction={onOpenCreateMeetup}
          compact
        />
      ) : (
        meetupsList.map((meetup) => (
          <View key={meetup.id} style={[styles.sessionListCard, { gap: 8 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable onPress={() => setSelectedMeetupMap(meetup)} style={{ flex: 1, flexShrink: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                  <Feather name="map-pin" size={14} color={brand.primary} />
                  <Text numberOfLines={1} style={[styles.communityName, { color: brand.primary, flexShrink: 1 }]}>{meetup.title}</Text>
                </View>
              </Pressable>
              <Pill label={`${meetup.rsvpCount} Attending`} compact />
            </View>
            <Pressable
              onPress={() => handleOpenInMaps(meetup)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${meetup.location} in Maps`}
              style={({ pressed }) => [styles.meetupLocationRow, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="location-outline" size={14} color={brand.primary} />
              <Text style={[styles.mutedCopySmall, styles.meetupLocationText]}>{meetup.location}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="calendar" size={13} color={colors.muted} />
              <Text style={styles.sessionTime}>{meetup.dateTime} · Host: {meetup.organizer}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setSelectedMeetupMap(meetup)}
                style={{ backgroundColor: '#ECE7E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="map-outline" size={14} color={colors.text} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>View Map Pin</Text>
              </Pressable>

              <Pressable
                onPress={() => handleRSVP(meetup)}
                style={{ backgroundColor: meetup.rsvpStatus ? '#D9F4DE' : brand.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: meetup.rsvpStatus ? '#2F8B4E' : '#fff' }}>
                  {meetup.rsvpStatus ? 'RSVP Confirmed' : 'RSVP (+50 Pts)'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      {/* Real, interactive KNUST campus map & turn-by-turn walking directions. */}
      <KNUSTMapModal
        visible={Boolean(selectedMeetupMap)}
        meetup={selectedMeetupMap}
        allMeetups={meetupsList}
        onClose={() => setSelectedMeetupMap(null)}
        onRSVP={(meetup) => {
          handleRSVP(meetup);
          setSelectedMeetupMap(null);
        }}
      />
    </ScrollView>
  );
}
