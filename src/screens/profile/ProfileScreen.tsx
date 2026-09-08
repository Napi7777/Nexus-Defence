import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import { AppImage } from '@/components/media';
import { EmptyState, SkeletonList, useRefreshControl } from '@/components/feedback';
import { ActionRow, Pill, StatCard, Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, SessionItem } from '@/data/mockData';
import {
  AttendanceRecord,
  getIsAdmin,
  getMyAttendance,
  getMyProgress,
  ProgressSummary,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';

import { ParticipationModal } from './components/ParticipationModal';

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

export function ProfileScreen({
  onEditProfile,
  onOpenSettings,
  onOpenModeration,
  onSignOut,
}: {
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenModeration?: () => void;
  onSignOut?: () => void;
}) {
  const colors = useThemeColors();
  const { profile, updateProfile, reviewsList, sessionsList } = useAppStore();
  const refreshControl = useRefreshControl();

  // Sessions and points used to be static values on the profile row. Read the
  // real totals from attendance and the points ledger instead, falling back to
  // the stored values until they load.
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  // The moderation queue is only offered to admins — a non-admin opening it
  // would see an empty list, because RLS returns only their own reports.
  const [isAdmin, setIsAdmin] = useState(false);

  const totalPointsFromActivity = Math.max(progress?.pointsEarned ?? 0, profile.points || 0);

  // Own session history (SRS 3.9) — null while loading, [] once loaded empty.
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);
  // Tutor-side monitoring (SRS 3.9): sessions this account hosts, and which
  // one's roster is currently open. There's no separate tutor/student role in
  // this app — anyone who has scheduled a live session shows up here as its
  // host, the same way ratings.ts already attributes a session to its tutor.
  const hostedSessions = sessionsList.filter(
    (s) => s.tutorId && profile.id && s.tutorId === profile.id
  );
  const [participationSession, setParticipationSession] = useState<SessionItem | null>(null);

  useEffect(() => {
    let active = true;
    getIsAdmin().then((value) => {
      if (active) setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, [profile.id]);

  useEffect(() => {
    let active = true;
    getMyProgress().then((summary) => {
      if (active && summary) {
        setProgress(summary);
        if (summary.pointsEarned > (profile.points || 0)) {
          updateProfile({ points: summary.pointsEarned });
        }
      }
    });
    return () => {
      active = false;
    };
  }, [profile.id]);

  useEffect(() => {
    let active = true;
    getMyAttendance(10).then((rows) => {
      if (active) setAttendance(rows);
    });
    return () => {
      active = false;
    };
  }, [profile.id]);
  const [endorsements, setEndorsements] = useState<Record<string, number>>({});

  // Cosmetic only — this is your own profile, so "endorsing" your own skill
  // isn't a real achievement. It used to also hand out +10 XP per click,
  // which meant tapping this button was an unlimited free-points button.
  const handleEndorseSkill = (skill: string) => {
    setEndorsements((prev) => ({
      ...prev,
      [skill]: (prev[skill] || 0) + 1,
    }));
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.profileScrollContent}
      refreshControl={refreshControl}
    >
      <View style={styles.profileHero}>
        <Pressable onPress={onEditProfile} style={styles.floatingEditButton}>
          <Ionicons name="pencil" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          <AppImage source={{ uri: profile.avatar }} style={styles.profileAvatar} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.profileHeadingRow}>
          <View style={styles.flexFill}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.mutedCopySmall}>
              {profile.major} · {profile.year}
            </Text>
            <Text style={styles.mutedCopySmall}>{profile.university}</Text>

            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#137333" />
              <Text style={styles.verifiedText}>Verified Peer Tutor</Text>
            </View>

            <View style={[styles.levelBadgeChip, { marginTop: 6 }]}>
              <Text style={styles.levelBadgeText}>
                {profile.points >= 1000 ? 'Level 5: Campus Legend' : profile.points >= 750 ? 'Level 4: Scholar' : profile.points >= 500 ? 'Level 3: Master Peer' : profile.points >= 250 ? 'Level 2: Study Mentor' : 'Level 1: Academic Novice'}
              </Text>
            </View>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color="#E3A322" />
            <Text style={styles.ratingText}>{profile.rating}</Text>
          </View>
        </View>

        <Text style={styles.profileBio}>{profile.bio}</Text>

        <View style={styles.statsRow}>
          <StatCard
            label="Sessions"
            value={String(progress?.sessionsAttended ?? profile.sessions)}
          />
          <StatCard label="Communities" value={String(profile.communities)} />
          {/* Reads the same profile.points the Home screen shows, so the two never disagree. */}
          <StatCard label="Points" value={String(profile.points || 0)} />
        </View>

        {/* Learning History — sessions attended & points earned (SRS 3.9). Derived
            from session_attendance, not a static field on the profile row. */}
        <Text style={[styles.subsectionTitle, { marginTop: 4 }]}>Learning History</Text>
        <View style={styles.historySummaryRow}>
          <View style={styles.historySummaryChip}>
            <Text style={styles.historySummaryValue}>{attendance ? attendance.length : (progress?.sessionsAttended ?? 0)}</Text>
            <Text style={styles.historySummaryLabel}>Sessions completed</Text>
          </View>
          <View style={styles.historySummaryChip}>
            <Text style={styles.historySummaryValue}>{totalPointsFromActivity}</Text>
            <Text style={styles.historySummaryLabel}>Points from activity</Text>
          </View>
        </View>

        {attendance === null ? (
          <SkeletonList count={2} lines={1} />
        ) : attendance.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No sessions attended yet"
            message="Join a live session and it'll show up here."
            compact
          />
        ) : (
          attendance.map((record) => (
            <View key={`${record.sessionId}-${record.joinedAt}`} style={styles.attendanceRow}>
              <View style={styles.recommendedIcon}>
                <Ionicons name="checkmark-done" size={16} color={brand.primary} />
              </View>
              <View style={styles.flexFill}>
                <Text style={styles.communityName}>{record.title}</Text>
                <Text style={styles.mutedCopySmall}>
                  {record.tag} · {relativeTime(record.joinedAt)}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Skills & Interactive Endorsements */}
        <Text style={styles.subsectionTitle}>Endorsed Skills</Text>
        <View style={{ gap: 8, marginVertical: 6 }}>
          {profile.skills.length === 0 ? (
            <Text style={[styles.mutedCopySmall, { fontStyle: 'italic' }]}>
              No skills listed yet. Tap the edit pencil above to add your subject specialties!
            </Text>
          ) : (
            profile.skills.map((skill) => (
              <View key={skill} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pill label={skill} compact />
                <Pressable
                  onPress={() => handleEndorseSkill(skill)}
                  style={styles.endorseChip}
                >
                  <Ionicons name="thumbs-up-outline" size={14} color={brand.primary} />
                  <Text style={styles.endorseCount}>+1 Endorse ({endorsements[skill] || 0})</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Tutor-side monitoring (SRS 3.9): who attended a session you host,
            when, and for how long. Only shown for sessions with a tutorId
            matching this account — the app has no separate tutor/student role,
            so "tutor" here just means "hosted a session", the same field
            ratings.ts already relies on to attribute a rating. */}
        {hostedSessions.length > 0 ? (
          <>
            <Text style={[styles.subsectionTitle, { marginTop: 8 }]}>Sessions You Host</Text>
            {hostedSessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => setParticipationSession(session)}
                accessibilityRole="button"
                accessibilityLabel={`View participation for ${session.title}`}
                style={({ pressed }) => [styles.hostedSessionRow, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.flexFill}>
                  <Text style={styles.communityName}>{session.title}</Text>
                  <Text style={styles.mutedCopySmall}>{session.time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </>
        ) : null}

        {/* Student Star Reviews Feed — reviews received from students you've
            tutored. Written from the session lobby when a student leaves a
            session you hosted, never from this screen (you can't review
            yourself). */}
        <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>Peer Tutor Reviews ({reviewsList.length})</Text>

        {reviewsList.length === 0 ? (
          <Text style={[styles.mutedCopySmall, { marginTop: 4 }]}>
            No reviews yet. They'll show up here after students you tutor rate a session.
          </Text>
        ) : (
          reviewsList.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 13, color: colors.text }}>{rev.author}</Text>
                <Text style={styles.mutedCopySmall}>{rev.date}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name="star"
                    size={12}
                    color={star <= rev.rating ? '#E3A322' : '#E2DFD7'}
                  />
                ))}
              </View>
              <Text style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{rev.comment}</Text>
            </View>
          ))
        )}

        {/* Edit Profile, Privacy & Security, and Notification Preferences now
            live inside Settings, alongside device appearance — this is the
            single "more" entry point off the profile card. */}
        <ActionRow label="Settings" onPress={onOpenSettings} icon="settings-outline" />

        {isAdmin && onOpenModeration ? (
          <ActionRow
            label="Moderation Queue"
            onPress={onOpenModeration}
            icon="shield-checkmark-outline"
          />
        ) : null}

        <Pressable onPress={onSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={18} color={brand.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <ParticipationModal
        session={participationSession}
        visible={Boolean(participationSession)}
        onClose={() => setParticipationSession(null)}
      />
    </ScrollView>
  );
}
