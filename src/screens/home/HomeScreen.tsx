import { useEffect, useMemo, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';
import { Avatar, IconButton, Pill, StatCard, Text } from '@/components/ui';
import { AppImage } from '@/components/media';
import { SkeletonList, useRefreshControl, useToast } from '@/components/feedback';
import { tapMedium } from '@/lib/haptics';
import { recommendTutors, ScoredTutor } from '@/lib/recommendations';
import { fetchAllProfiles, getActiveStudyDates } from '@/lib/supabase';
import { loadActiveDatesStorage, saveActiveDatesStorage } from '@/lib/storage';
import {
  calculateConsecutiveStreak,
  formatDateKey,
  formatStreakDisplay,
  formatStreakProfileString,
  getTimeOfDayGreeting,
  getWeekStreakDays,
  parseStreakNumber,
} from '@/lib/streak';
import { useAppStore } from '@/context/AppStoreContext';
import { brand } from '@/data/mockData';
import { styles, useThemeColors } from '@/styles/appStyles';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

function SectionHeading({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeadingRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable hitSlop={hitSlop} onPress={onAction} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <Text style={styles.sectionLink}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen({
  onOpenSearch,
  onOpenNotifications,
  onOpenFilters,
  onOpenProfile,
  onOpenLiveSession,
  onOpenCommunity,
  onOpenLeaderboard,
  notificationCount = 0,
}: {
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenFilters?: () => void;
  onOpenProfile?: () => void;
  onOpenLiveSession?: (sessionId?: string) => void;
  onOpenCommunity?: (communityId?: string) => void;
  onOpenLeaderboard?: () => void;
  /** Real unread-notification count. The bell only shows a badge when this
   * is > 0 — it used to be a hardcoded "3" regardless of whether anything
   * was actually unread. */
  notificationCount?: number;
}) {
  const colors = useThemeColors();
  const { profile, communitiesList, sessionsList, meetupsList, toggleRSVPMeetup, activityLog, loggedHours, logStudyTime } =
    useAppStore();
  const toast = useToast();

  const [now] = useState<Date>(() => new Date());
  const [activeStudyDates, setActiveStudyDates] = useState<string[]>([]);

  // Recommended tutors (SRS 3.4) — never wired anywhere. Needs the real
  // registered-user list (not just people already in the store), so it's
  // fetched once here rather than reused from elsewhere in the app.
  const [tutorRecommendations, setTutorRecommendations] = useState<ScoredTutor[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAllProfiles(profile.id).then((tutors) => {
      if (!active) return;
      setTutorRecommendations(recommendTutors(profile, tutors, 5));
      setLoadingTutors(false);
    });
    return () => {
      active = false;
    };
  }, [profile.id]);

  // Load active study dates from Supabase and cache in storage
  useEffect(() => {
    let active = true;
    async function loadDates() {
      const cached = await loadActiveDatesStorage();
      if (cached && cached.length > 0 && active) {
        setActiveStudyDates(cached);
      }
      if (profile.id) {
        const remote = await getActiveStudyDates(profile.id);
        if (active && remote && remote.length > 0) {
          setActiveStudyDates(remote);
          saveActiveDatesStorage(remote);
        }
      }
    }
    loadDates();
    return () => {
      active = false;
    };
  }, [profile.id]);

  // --- System-driven daily goals (read-only for the user) ---
  // Both the checkbox state (activityLog) and the XP for completing a goal
  // live in the app store now, not here — this screen used to award the XP
  // itself from a `useEffect` guarded by a `useRef`, but the Home tab
  // remounts on every navigation away and back, resetting that ref and
  // re-awarding already-earned XP on every revisit. The store's guard is a
  // real state value, so it can't be reset just by leaving the tab.
  const DAILY_GOALS = [
    {
      id: 'task-1',
      title: 'Attend 1 Live Peer Session',
      points: 50,
      activityKey: 'attendedSession' as const,
      hint: 'Join any live session to complete',
    },
    {
      id: 'task-2',
      title: 'Share Notes or Ask in Community',
      points: 25,
      activityKey: 'participatedCommunity' as const,
      hint: 'Post or reply in any community to complete',
    },
  ];

  const completedTasksCount = DAILY_GOALS.filter((g) => activityLog[g.activityKey]).length;

  const isTodayActive =
    loggedHours > 0 ||
    Boolean(activityLog.attendedSession) ||
    Boolean(activityLog.participatedCommunity);

  // Automatically record today as active if user completed study goals today
  useEffect(() => {
    if (isTodayActive) {
      const todayKey = formatDateKey(now);
      setActiveStudyDates((prev) => {
        if (!prev.includes(todayKey)) {
          const next = [todayKey, ...prev];
          saveActiveDatesStorage(next);
          return next;
        }
        return prev;
      });
    }
  }, [isTodayActive, now]);

  // Derive dynamic 7-day study streak week relative to real calendar date
  const streakDays = useMemo(() => {
    const profileStreakNum = parseStreakNumber(profile.streak);
    let effectiveDates = activeStudyDates;
    if (effectiveDates.length === 0 && profileStreakNum > 0) {
      const seeded: string[] = [];
      for (let i = 1; i <= profileStreakNum; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (isTodayActive ? i - 1 : i));
        seeded.push(formatDateKey(d));
      }
      effectiveDates = seeded;
    }
    return getWeekStreakDays(effectiveDates, isTodayActive, now);
  }, [activeStudyDates, isTodayActive, now, profile.streak]);

  // Real-time streak count and friendly labels
  const currentStreakCount = useMemo(() => {
    const computed = calculateConsecutiveStreak(activeStudyDates, isTodayActive, now);
    if (computed > 0) return computed;
    return parseStreakNumber(profile.streak) || (isTodayActive ? 1 : 0);
  }, [activeStudyDates, isTodayActive, now, profile.streak]);

  const streakTitle = formatStreakDisplay(currentStreakCount);
  const streakStatValue = formatStreakProfileString(currentStreakCount);
  const timeGreeting = useMemo(() => getTimeOfDayGreeting(now), [now]);

  // Derive active live session dynamically from account & store
  const activeLiveSession = sessionsList.find((s) => s.isLive) || {
    id: 'my-live-room',
    title: `${profile.name}'s Virtual Study Room`,
    tutor: profile.name,
    participants: '0 / 20 participants',
    image: profile.avatar,
    isLive: true,
  };

  const joinedCommunities = communitiesList.filter((c) => c.joined);
  const refreshControl = useRefreshControl();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenContent}
      refreshControl={refreshControl}
    >
      {/* Account Greeting Header */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.mutedCopy}>{timeGreeting}</Text>
          <Text style={styles.titleLarge}>{profile.name.split(' ')[0] || 'Learner'}</Text>
        </View>
        <View style={styles.topActionRow}>
          <IconButton icon="search" onPress={onOpenSearch || onOpenFilters || (() => {})} />
          <IconButton
            icon="notifications-outline"
            badge={notificationCount > 0 ? (notificationCount > 9 ? '9+' : String(notificationCount)) : undefined}
            onPress={onOpenNotifications || onOpenFilters || (() => {})}
          />
          <Avatar source={profile.avatar} size={40} onPress={onOpenProfile || (() => {})} />
        </View>
      </View>

      {/* Account Activity Stats Row */}
      <View style={styles.statsRow}>
        <StatCard label="Sessions" value={String(profile.sessions || 0)} />
        <StatCard label="Points" value={String(profile.points || 0)} accent="#E07038" />
        <StatCard label="Streak" value={streakStatValue} accent="#59B980" />
      </View>

      {/* Account 7-Day Study Streak Calendar */}
      <View style={styles.streakCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flame" size={22} color="#E07038" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{streakTitle}</Text>
          </View>
          <Pill label={`${loggedHours.toFixed(1)} / 6.0 Hrs Today`} compact tint="#EBF7EE" textColor="#2F8B4E" />
        </View>

        {/* 7-Day Weekday Chips */}
        <View style={styles.streakDaysRow}>
          {streakDays.map((d) => (
            <View
              key={d.dateKey}
              style={[
                styles.streakDayItem,
                d.active ? styles.streakDayItemActive : undefined,
                d.isToday ? styles.streakDayItemToday : undefined,
                d.isFuture ? styles.streakDayItemFuture : undefined,
              ]}
            >
              <Text style={[styles.streakDayName, d.isToday && { color: brand.primary, fontWeight: '800' }]}>
                {d.dayName}
              </Text>
              <Text style={[styles.streakDayDate, d.isToday && { color: brand.primary }]}>
                {d.dayNumber}
              </Text>
              <Ionicons
                name={d.active ? 'flame' : d.isToday ? 'radio-button-on' : 'ellipse-outline'}
                size={16}
                color={d.active ? '#E07038' : d.isToday ? brand.primary : colors.muted}
              />
            </View>
          ))}
        </View>

        {/* Log Study Time Action — capped at 6 hrs/day; past that the tap
            does nothing at all (no more hours, no more XP). */}
        <Pressable
          hitSlop={hitSlop}
          onPress={logStudyTime}
          disabled={loggedHours >= 6.0}
          style={({ pressed }) => [
            { alignSelf: 'flex-end', marginTop: 4 },
            pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: loggedHours >= 6.0 ? colors.muted : brand.primary }}>
            {loggedHours >= 6.0 ? 'Daily study cap reached' : '+ Log 30 Min Study (+15 XP)'}
          </Text>
        </Pressable>
      </View>

      {/* Account Daily Goals Checklist (system-driven — read only) */}
      <View style={{ marginBottom: 12 }}>
        <SectionHeading title={`Daily Study Goals (${completedTasksCount}/${DAILY_GOALS.length})`} />
        {DAILY_GOALS.map((goal) => {
          const done = activityLog[goal.activityKey];
          return (
            <View
              key={goal.id}
              style={[styles.goalTaskCard, { opacity: done ? 1 : 0.92 }]}
            >
              <View style={styles.goalTaskRow}>
                <Ionicons
                  name={done ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={done ? brand.primary : colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: done ? colors.muted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {goal.title}
                  </Text>
                  {!done && (
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {goal.hint}
                    </Text>
                  )}
                </View>
                <Pill
                  label={`+${goal.points} XP`}
                  compact
                  tint={done ? '#E6F4EA' : '#FFF4EB'}
                  textColor={done ? '#137333' : '#B16A0E'}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Gamification & Recorded Quick Links */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <Pressable
          hitSlop={hitSlop}
          onPress={onOpenLeaderboard}
          style={({ pressed }) => [
            styles.flexFill,
            { backgroundColor: '#FFF4EB', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#FFE4D1' },
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trophy" size={16} color="#E07038" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#B16A0E' }}>Leaderboard</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Rankings & Rewards</Text>
        </Pressable>

        <Pressable
          hitSlop={hitSlop}
          onPress={() => onOpenCommunity?.()}
          style={({ pressed }) => [
            styles.flexFill,
            { backgroundColor: '#EEF0FD', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D9DCFA' },
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people" size={16} color={brand.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: brand.primary }}>Communities</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Subject Study Hubs</Text>
        </Pressable>
      </View>

      {/* Dynamic Account Active Live Session Card */}
      <Pressable
        hitSlop={hitSlop}
        onPress={() => onOpenLiveSession?.()}
        style={({ pressed }) => [styles.liveCard, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
      >
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE NOW</Text>
        </View>
        <Text style={styles.liveTitle}>{activeLiveSession.title}</Text>
        <Text style={styles.liveMeta}>
          Host: {activeLiveSession.tutor} · {activeLiveSession.participants}
        </Text>
        <View style={styles.inlineButton}>
          <Ionicons name="play" size={14} color="#fff" />
          <Text style={styles.inlineButtonText}>Enter Virtual Lobby</Text>
        </View>
      </Pressable>

      {/* Dynamic Scheduled Live Sessions */}
      <SectionHeading
        title="Scheduled Live Sessions"
        actionLabel={sessionsList.length > 0 ? 'See all' : undefined}
        onAction={sessionsList.length > 0 ? () => onOpenLiveSession?.() : undefined}
      />
      {sessionsList.length === 0 ? (
        <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
            No upcoming live sessions scheduled yet. Tap "+ Schedule Live" in Sessions to create one!
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {sessionsList.map((session) => (
            <Pressable
              key={session.id}
              hitSlop={hitSlop}
              onPress={() => onOpenLiveSession?.(session.id)}
              style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
            >
              <Avatar source={session.image} size={34} />
              <Text style={styles.sessionTitle}>{session.title}</Text>
              <Text style={styles.sessionTime}>{session.time}</Text>
              <Text style={styles.sessionParticipants}>{session.participants}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Recommended Tutors (SRS 3.4) — scored from interests, skills and skill
          level against the real registered-user list, same premise as the
          "Recommended for you" communities section. Informational only: there
          is no tutor profile screen to deep-link into yet. */}
      {loadingTutors || tutorRecommendations.length > 0 ? (
        <>
          <SectionHeading title="Recommended Tutors" />
          {loadingTutors ? (
            <SkeletonList count={2} lines={1} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {tutorRecommendations.map(({ tutor, reason }) => (
                <View key={tutor.id} style={styles.sessionCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Avatar source={tutor.avatar} size={34} />
                    <View style={styles.ratingPill}>
                      <Ionicons name="star" size={11} color="#E3A322" />
                      <Text style={styles.ratingText}>{tutor.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionTitle}>{tutor.name}</Text>
                  <Text style={styles.sessionParticipants} numberOfLines={2}>
                    {reason}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      ) : null}

      {/* Account Campus Meetups */}
      <SectionHeading title="In-Person Campus Meetups" actionLabel={meetupsList.length > 0 ? 'RSVP' : undefined} />
      {meetupsList.length === 0 ? (
        <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
            No campus meetups scheduled yet. Discover or organize study groups in Sessions!
          </Text>
        </View>
      ) : (
        meetupsList.map((meetup) => (
          <View key={meetup.id} style={[styles.communityRowCard, { flexDirection: 'column', alignItems: 'flex-start', padding: 14, gap: 6 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexShrink: 1 }}>
                <Ionicons name="location" size={16} color={brand.primary} />
                <Text numberOfLines={1} style={[styles.communityName, { flexShrink: 1 }]}>{meetup.title}</Text>
              </View>
              <Pill label={`${meetup.rsvpCount} Attending`} compact />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="map-pin" size={12} color={colors.muted} />
              <Text style={styles.mutedCopySmall}>{meetup.location} · {meetup.dateTime}</Text>
            </View>
            <Pressable
              hitSlop={hitSlop}
              onPress={() => {
                tapMedium();
                toggleRSVPMeetup(meetup.id);
                toast.show(
                  meetup.rsvpStatus ? `Cancelled RSVP for ${meetup.title}` : `You're going to ${meetup.title}`,
                  meetup.rsvpStatus ? 'info' : 'success'
                );
              }}
              style={({ pressed }) => [
                { marginTop: 6, alignSelf: 'flex-end', backgroundColor: meetup.rsvpStatus ? '#D9F4DE' : brand.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
                pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: meetup.rsvpStatus ? '#2F8B4E' : '#fff' }}>
                {meetup.rsvpStatus ? 'Going' : '+ RSVP (+50 Pts)'}
              </Text>
            </Pressable>
          </View>
        ))
      )}

      {/* Account Joined Communities */}
      <SectionHeading title="My Communities" actionLabel="See all" onAction={() => onOpenCommunity?.()} />
      {joinedCommunities.length === 0 ? (
        <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
            You haven't joined any communities yet. Discover groups in the Communities tab!
          </Text>
        </View>
      ) : (
        joinedCommunities.slice(0, 3).map((community) => (
          <Pressable
            key={community.id}
            hitSlop={hitSlop}
            onPress={() => onOpenCommunity?.(community.id)}
            style={({ pressed }) => [styles.communityRowCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          >
            <AppImage source={{ uri: community.image }} style={styles.communityThumb} />
            <View style={styles.flexFill}>
              <Text style={styles.communityName}>{community.name}</Text>
              <Text style={styles.mutedCopySmall}>{community.members} members · {community.subject}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
