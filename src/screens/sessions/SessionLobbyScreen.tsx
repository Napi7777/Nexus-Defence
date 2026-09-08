import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParticipantVideo } from '@/components/media';
import { useToast } from '@/components/feedback';
import { Text } from '@/components/ui';
import { useAppStore } from '@/context/AppStoreContext';
import { DEFAULT_AVATAR, liveSession, UserProfile } from '@/data/mockData';
import { notifySuccess } from '@/lib/haptics';
import {
  fetchAllProfiles,
  getMessages,
  getOrCreateGroupThread,
  sendSupabaseMessage,
  subscribeToThreadMessages,
} from '@/lib/supabase';
import { useVideoRoom } from '@/lib/video';

import { BreakoutRoomsModal } from './components/BreakoutRoomsModal';
import { ClassNotesModal } from './components/ClassNotesModal';
import { ClassPollModal } from './components/ClassPollModal';
import { InMeetingChatModal } from './components/InMeetingChatModal';
import { InteractiveWhiteboardModal } from './components/InteractiveWhiteboardModal';
import { InviteSessionModal } from './components/InviteSessionModal';
import { LobbyControlBar } from './components/LobbyControlBar';
import { ParticipantsModal } from './components/ParticipantsModal';

export function SessionLobbyScreen({
  onLeave,
  sessionId,
}: {
  onLeave: () => void;
  /** The session being joined. Falls back to the seeded demo session. */
  sessionId?: string;
}) {
  const {
    profile,
    updateProfile,
    addReview,
    recordActivity,
    reviewedSessionIds,
    sessionsList,
    logStudyMinutes,
  } = useAppStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [showRateTutor, setShowRateTutor] = useState(false);
  const [rateValue, setRateValue] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [viewMode, setViewMode] = useState<'speaker' | 'gallery' | 'board'>('speaker');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showInMeetingChat, setShowInMeetingChat] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [searchRoster, setSearchRoster] = useState('');
  const [isMutedAll, setIsMutedAll] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const [draftChat, setDraftChat] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [registeredPeers, setRegisteredPeers] = useState<UserProfile[]>([]);

  // Real-time Session Duration & Activity Tracking
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastSyncedMinutesRef = useRef<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    lastSyncedMinutesRef.current = 0;
    const timer = setInterval(() => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      setElapsedSeconds(diffSecs);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Zoom Interactive Classroom State
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showBreakout, setShowBreakout] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [activeBreakoutPod, setActiveBreakoutPod] = useState<string | null>(null);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | undefined>(undefined);
  const [audioLevels, setAudioLevels] = useState<number[]>([6, 12, 18, 10]);

  const toast = useToast();

  const activeSessionId = sessionId || liveSession.id;
  const [sessionThreadId, setSessionThreadId] = useState(`live-session-${activeSessionId}`);

  const room = useVideoRoom({
    sessionId: activeSessionId,
    displayName: profile?.name || 'You',
    avatar: profile?.avatar,
  });

  // Animated Audio Visualizer Bars
  useEffect(() => {
    if (isMuted) {
      setAudioLevels([3, 3, 3, 3]);
      return;
    }
    const interval = setInterval(() => {
      setAudioLevels([
        Math.floor(Math.random() * 12) + 4,
        Math.floor(Math.random() * 16) + 6,
        Math.floor(Math.random() * 18) + 5,
        Math.floor(Math.random() * 14) + 4,
      ]);
    }, 180);
    return () => clearInterval(interval);
  }, [isMuted]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initMeetingServices() {
      const activeUserId = profile?.id || profile?.name || 'user-me';

      const resolvedThreadId =
        (await getOrCreateGroupThread(`session:${activeSessionId}`, 'Live Session Chat')) ||
        `live-session-${activeSessionId}`;
      setSessionThreadId(resolvedThreadId);

      // 1. Fetch live in-meeting chat history from Supabase
      const history = await getMessages(resolvedThreadId, activeUserId);
      if (history && history.length > 0) {
        setChatMessages(
          history.map((m) => ({
            id: m.id,
            sender: m.sender === 'me' ? profile?.name || 'You' : 'Peer Learner',
            text: m.text,
            time: m.time,
          }))
        );
      }

      // 2. Subscribe to real-time WebSocket chat updates
      unsubscribe = subscribeToThreadMessages(
        resolvedThreadId,
        (newMsg) => {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || (m.text === newMsg.text && m.sender === (profile?.name || 'You')))) {
              return prev;
            }
            return [
              ...prev,
              {
                id: newMsg.id,
                sender: newMsg.sender === 'me' ? profile?.name || 'You' : 'Peer Learner',
                text: newMsg.text,
                time: newMsg.time,
              },
            ];
          });
        },
        activeUserId
      );

      // 3. Fetch live registered profiles for Zoom roster & video grid
      const peers = await fetchAllProfiles(profile?.id);
      if (peers) {
        setRegisteredPeers(peers);
      }
    }

    setChatMessages([]);
    initMeetingServices();
    recordActivity('attendedSession');

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.name, activeSessionId]);

  // Mirror control changes into the provider so a real SDK publishes/unpublishes.
  useEffect(() => {
    room.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    room.setCameraEnabled(isCameraOn);
  }, [isCameraOn]);

  useEffect(() => {
    room.setHandRaised(isHandRaised);
  }, [isHandRaised]);

  const handleToggleCamera = async () => {
    if (!isCameraOn && !permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setIsCameraOn((prev) => !prev);
  };

  const handleFlipCamera = () => {
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
    room.switchCamera();
  };

  const triggerReaction = (emoji: string) => {
    const id = `emoji-${Date.now()}-${Math.random()}`;
    const left = Math.floor(Math.random() * 60) + 20;
    setFloatingEmojis((prev) => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2400);
  };

  const handleSendInMeetingChat = async () => {
    if (!draftChat.trim()) return;
    const textToSend = draftChat.trim();
    setDraftChat('');

    const newMsg = {
      id: `chat-${Date.now()}`,
      sender: profile?.name || 'You',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, newMsg]);

    try {
      await sendSupabaseMessage(sessionThreadId, textToSend, profile?.id);
    } catch (err) {
      console.warn('In-meeting chat send error:', err);
    }
  };

  const syncSessionDuration = useCallback(() => {
    const elapsedMins = Math.max(0, Math.floor((Date.now() - sessionStartTimeRef.current) / 60000));
    const newDeltaMins = elapsedMins - lastSyncedMinutesRef.current;
    if (newDeltaMins > 0) {
      lastSyncedMinutesRef.current = elapsedMins;
      logStudyMinutes(newDeltaMins);
    }
    import('@/lib/supabase').then(({ updateSessionAttendanceMinutes }) => {
      updateSessionAttendanceMinutes(activeSessionId, elapsedMins);
    }).catch(() => {});
  }, [activeSessionId, logStudyMinutes]);

  useEffect(() => {
    const interval = setInterval(syncSessionDuration, 30000);
    return () => {
      clearInterval(interval);
      syncSessionDuration();
    };
  }, [syncSessionDuration]);

  const currentSession = sessionsList.find((s) => s.id === sessionId);
  const activeHostId = currentSession?.tutorId;
  const activeHostName = currentSession?.tutor || (liveSession.tutor && liveSession.tutor !== 'Priya Sharma' ? liveSession.tutor : (profile?.name || 'Lead Peer Tutor'));
  const activeHostAvatar = currentSession?.image || profile?.avatar || DEFAULT_AVATAR;
  const activeSessionTitle = currentSession?.title || liveSession.title || (profile?.name ? profile.name + "'s Live Study Session" : 'Live Peer Session');

  const handleLeaveSession = () => {
    syncSessionDuration();
    const alreadyReviewed = reviewedSessionIds.includes(activeSessionId);
    if (activeHostName && activeHostName !== (profile?.name || 'You') && !alreadyReviewed) {
      setRateValue(5);
      setRateComment('');
      setShowRateTutor(true);
      return;
    }
    onLeave();
  };

  const handleSubmitReview = () => {
    syncSessionDuration();
    addReview({
      sessionId: activeSessionId,
      tutorId: activeHostId,
      tutorName: activeHostName,
      rating: rateValue,
      comment: rateComment,
    });
    notifySuccess();
    toast.show('Thanks for rating your tutor!');
    setShowRateTutor(false);
    onLeave();
  };

  const handleSkipReview = () => {
    syncSessionDuration();
    setShowRateTutor(false);
    onLeave();
  };

  const participantsList = useMemo(
    () => [
      {
        id: 'self',
        name: (profile?.name || 'You') + ' (You)',
        role: 'You',
        avatar: profile?.avatar || DEFAULT_AVATAR,
        isMuted,
        isCameraOn,
        isHandRaised,
      },
      ...room.remotes.map((p) => ({
        id: p.id,
        name: p.name,
        role: 'Participant',
        avatar: p.avatar || DEFAULT_AVATAR,
        isMuted: p.isMuted,
        isCameraOn: p.isCameraOn,
        isHandRaised: p.isHandRaised,
      })),
    ],
    [profile?.name, profile?.avatar, isMuted, isCameraOn, isHandRaised, room.remotes],
  );

  const filteredRoster = useMemo(() => {
    const needle = searchRoster.toLowerCase();
    if (!needle) return participantsList;
    return participantsList.filter((p) => p.name.toLowerCase().includes(needle));
  }, [participantsList, searchRoster]);

  const spotlightPerson = spotlightedParticipantId
    ? participantsList.find((p) => p.id === spotlightedParticipantId)
    : null;
  const currentSpeakerName = spotlightPerson ? spotlightPerson.name : activeHostName;
  const currentSpeakerAvatar = spotlightPerson ? spotlightPerson.avatar : activeHostAvatar;

  const handleSpotlightParticipant = (id: string) => {
    if (spotlightedParticipantId === id) {
      setSpotlightedParticipantId(undefined);
      toast.show('Spotlight cleared', 'info');
    } else {
      setSpotlightedParticipantId(id);
      const target = participantsList.find((p) => p.id === id);
      toast.show(`Spotlighted ${target?.name || 'Participant'} 🌟`, 'success');
    }
  };

  const handleLowerHand = (id: string) => {
    if (id === 'self' || id === profile?.id) {
      setIsHandRaised(false);
    }
    toast.show('Hand lowered', 'info');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0F19' }}>
      {/* Zoom Top Control Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: '#111827',
          borderBottomWidth: 1,
          borderBottomColor: '#1F2937',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#10B981',
              }}
            />
            <Ionicons
              name={room.supportsRemoteMedia ? 'shield-checkmark' : 'eye-outline'}
              size={14}
              color={room.supportsRemoteMedia ? '#10B981' : '#F59E0B'}
            />
            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>
              {room.supportsRemoteMedia ? 'Encrypted Call' : 'Preview Mode'}
            </Text>
          </View>

          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setShowInviteModal(true)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(2, 132, 199, 0.18)',
                borderColor: '#0284C7',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              },
              pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons name="link-outline" size={13} color="#38BDF8" />
            <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>Invite Link</Text>
          </Pressable>

          {/* Real-time Session Activity Timer */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderColor: '#EF4444',
              borderWidth: 1,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
            <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '700' }}>
              {formatDuration(elapsedSeconds)}
            </Text>
          </View>
        </View>

        {room.status === 'failed' && room.error ? (
          <View style={{ backgroundColor: '#7F1D1D', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: '#FECACA', fontSize: 12 }}>{room.error}</Text>
          </View>
        ) : null}

        {/* View Mode Switcher: Speaker | Gallery | Board */}
        <View style={{ flexDirection: 'row', backgroundColor: '#1F2937', borderRadius: 8, padding: 2 }}>
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setViewMode('speaker')}
            style={({ pressed }) => [
              {
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: viewMode === 'speaker' ? '#3B82F6' : 'transparent',
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] },
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Speaker</Text>
          </Pressable>
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setViewMode('gallery')}
            style={({ pressed }) => [
              {
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: viewMode === 'gallery' ? '#3B82F6' : 'transparent',
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] },
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Gallery</Text>
          </Pressable>
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setViewMode('board')}
            style={({ pressed }) => [
              {
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: viewMode === 'board' ? '#3B82F6' : 'transparent',
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] },
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Board</Text>
          </Pressable>
        </View>
      </View>

      {/* Breakout Pod Banner if active */}
      {activeBreakoutPod ? (
        <View
          style={{
            backgroundColor: '#6D28D9',
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="git-branch" size={16} color="#EDE9FE" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              Study Pod: {activeBreakoutPod}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setActiveBreakoutPod(null);
              toast.show('Returned to main session room', 'info');
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Return to Main</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Main Video Meeting Stage */}
      <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Animated Floating Emoji Reactions Layer */}
        {floatingEmojis.map((item) => (
          <View
            key={item.id}
            style={{
              position: 'absolute',
              bottom: 120,
              left: `${item.left}%`,
              zIndex: 99,
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
          </View>
        ))}

        {viewMode === 'speaker' ? (
          /* SPEAKER VIEW */
          <ImageBackground source={{ uri: currentSpeakerAvatar }} style={{ flex: 1, justifyContent: 'space-between' }}>
            <LinearGradient colors={['rgba(11,15,25,0.3)', 'rgba(11,15,25,0.85)']} style={{ flex: 1, padding: 16 }}>
              {/* Speaker Header Info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{activeSessionTitle}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Speaker: {currentSpeakerName}</Text>
                </View>

                {isHandRaised ? (
                  <View style={{ backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="hand-left" size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Hand Raised</Text>
                  </View>
                ) : null}
              </View>

              {/* Active Speaker Spotlight Indicator + Audio Waveform */}
              <View
                style={{
                  marginTop: 'auto',
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(16,185,129,0.2)',
                  borderColor: '#10B981',
                  borderWidth: 1.5,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="mic" size={14} color="#10B981" />
                <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 12 }}>
                  Active Speaker: {currentSpeakerName}
                </Text>

                {/* Animated Audio Waveform */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 }}>
                  {audioLevels.map((lvl, i) => (
                    <View
                      key={`wave-${i}`}
                      style={{
                        width: 3,
                        height: lvl,
                        backgroundColor: '#10B981',
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </View>
              </View>
            </LinearGradient>

            {/* Local PiP User Camera View */}
            <View
              style={{
                position: 'absolute',
                bottom: 20,
                right: 16,
                width: 120,
                height: 160,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: '#3B82F6',
                backgroundColor: '#1F2937',
              }}
            >
              {room.supportsRemoteMedia && room.local ? (
                <ParticipantVideo participant={room.local} mirror={cameraFacing === 'front'} />
              ) : isCameraOn && permission?.granted ? (
                <CameraView facing={cameraFacing} style={{ width: '100%', height: '100%' }} />
              ) : isCameraOn ? (
                <Image source={{ uri: profile.avatar }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
                  <Ionicons name="videocam-off" size={24} color="#6B7280" />
                  <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: 4 }}>Camera Off</Text>
                </View>
              )}

              <Pressable
                onPress={handleFlipCamera}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: 5,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="camera-reverse-outline" size={14} color="#FFFFFF" />
              </Pressable>
              <View
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={10} color={isMuted ? '#EF4444' : '#10B981'} />
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>You</Text>
              </View>
            </View>
          </ImageBackground>
        ) : viewMode === 'gallery' ? (
          /* GALLERY GRID VIEW (2x3 Grid) */
          <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
              {participantsList.map((item) => {
                const isItemSpotlight = spotlightedParticipantId === item.id || (!spotlightedParticipantId && item.name.includes(activeHostName));
                return (
                  <View
                    key={item.id}
                    style={{
                      width: '48.5%',
                      height: 145,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#1F2937',
                      borderWidth: isItemSpotlight ? 2 : 1,
                      borderColor: isItemSpotlight ? '#10B981' : '#374151',
                      position: 'relative',
                    }}
                  >
                    {room.supportsRemoteMedia ? (
                      <ParticipantVideo
                        participant={
                          item.id === 'self'
                            ? room.local ?? {
                                id: 'self',
                                name: item.name,
                                avatar: item.avatar,
                                isLocal: true,
                                isMuted: item.isMuted,
                                isCameraOn: item.isCameraOn,
                                isSpeaking: false,
                                isHandRaised: item.isHandRaised,
                                isScreenSharing: false,
                              }
                            : room.remotes.find((p) => p.id === item.id) ?? {
                                id: item.id,
                                name: item.name,
                                avatar: item.avatar,
                                isLocal: false,
                                isMuted: item.isMuted,
                                isCameraOn: item.isCameraOn,
                                isSpeaking: false,
                                isHandRaised: item.isHandRaised,
                                isScreenSharing: false,
                              }
                        }
                        mirror={item.id === 'self' && cameraFacing === 'front'}
                      />
                    ) : item.id === 'self' && isCameraOn && permission?.granted ? (
                      <CameraView facing={cameraFacing} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Image source={{ uri: item.avatar }} style={{ width: '100%', height: '100%' }} />
                    )}

                    {/* Tile Footer Badge */}
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', flex: 1 }}>
                          {item.name}
                        </Text>
                        {isItemSpotlight && !item.isMuted ? (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 10 }}>
                            <View style={{ width: 2, height: 8, backgroundColor: '#10B981', borderRadius: 1 }} />
                            <View style={{ width: 2, height: 10, backgroundColor: '#10B981', borderRadius: 1 }} />
                            <View style={{ width: 2, height: 6, backgroundColor: '#10B981', borderRadius: 1 }} />
                          </View>
                        ) : null}
                      </View>
                      <Ionicons
                        name={item.isMuted ? 'mic-off' : 'mic'}
                        size={13}
                        color={item.isMuted ? '#EF4444' : '#10B981'}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          /* WHITEBOARD STAGE VIEW */
          <View style={{ flex: 1, backgroundColor: '#0B0F19', padding: 16, justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                width: '100%',
                backgroundColor: '#111827',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#374151',
                padding: 24,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="easel" size={32} color="#818CF8" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                Interactive Classroom Whiteboard
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
                Draw formulas, sketch diagrams, write equations, and annotate in real time with peer learners.
              </Text>

              <Pressable
                onPress={() => setShowWhiteboard(true)}
                style={({ pressed }) => [
                  {
                    marginTop: 20,
                    backgroundColor: '#4F46E5',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Open Whiteboard Canvas</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Floating Emoji Reactions Bar */}
      {showReactionsBar ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: '#1F2937',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: '#374151',
          }}
        >
          {['👏', '👍', '🔥', '❤️', '🎉', '💡', '🙌'].map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => triggerReaction(emoji)}
              style={{
                padding: 8,
                backgroundColor: '#374151',
                borderRadius: 20,
              }}
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Zoom Bottom Control Bar with Classroom Tools */}
      <LobbyControlBar
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        isCameraOn={isCameraOn}
        onToggleCamera={handleToggleCamera}
        onFlipCamera={handleFlipCamera}
        onOpenInvite={() => setShowInviteModal(true)}
        onOpenWhiteboard={() => setShowWhiteboard(true)}
        onOpenPolls={() => setShowPolls(true)}
        onOpenBreakout={() => setShowBreakout(true)}
        onOpenNotes={() => setShowNotes(true)}
        onOpenChat={() => setShowInMeetingChat(true)}
        onOpenParticipants={() => setShowParticipants(true)}
        participantCount={participantsList.length}
        isHandRaised={isHandRaised}
        showReactionsBar={showReactionsBar}
        onToggleReactions={() => setShowReactionsBar((prev) => !prev)}
        onLeave={handleLeaveSession}
      />

      {/* Invite Session Link Modal */}
      <InviteSessionModal
        visible={showInviteModal}
        sessionId={activeSessionId}
        sessionTitle={activeSessionTitle}
        hostName={activeHostName}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Interactive Whiteboard Modal */}
      <InteractiveWhiteboardModal
        visible={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
      />

      {/* Live Classroom Polls Modal */}
      <ClassPollModal
        visible={showPolls}
        isHost={profile?.name === activeHostName}
        onAwardXP={(amount: number) => {
          updateProfile({ points: (profile?.points || 0) + amount });
          toast.show(`Earned +${amount} XP for poll participation! 🎯`, 'success');
        }}
        onClose={() => setShowPolls(false)}
      />

      {/* Breakout Study Pods Modal */}
      <BreakoutRoomsModal
        visible={showBreakout}
        currentUserId={profile?.id || 'self'}
        currentUserName={profile?.name || 'You'}
        currentUserAvatar={profile?.avatar}
        activePodId={activeBreakoutPod}
        onJoinPod={(podId: string) => {
          setActiveBreakoutPod(podId);
          toast.show(`Joined Breakout Pod: ${podId} 🚀`, 'success');
        }}
        onLeavePod={() => {
          setActiveBreakoutPod(null);
          toast.show('Returned to main session', 'info');
        }}
        onClose={() => setShowBreakout(false)}
      />

      {/* Collaborative Class Notes Modal */}
      <ClassNotesModal
        visible={showNotes}
        currentUserName={profile?.name || 'You'}
        onClose={() => setShowNotes(false)}
      />

      {/* In-Meeting Live Chat Modal */}
      <InMeetingChatModal
        visible={showInMeetingChat}
        messages={chatMessages}
        draft={draftChat}
        onChangeDraft={setDraftChat}
        onSend={handleSendInMeetingChat}
        onClose={() => setShowInMeetingChat(false)}
      />

      {/* Participants Roster & Moderation Modal */}
      <ParticipantsModal
        visible={showParticipants}
        participants={participantsList}
        filtered={filteredRoster}
        search={searchRoster}
        onChangeSearch={setSearchRoster}
        isMutedAll={isMutedAll}
        spotlightedId={spotlightedParticipantId}
        onSpotlightParticipant={handleSpotlightParticipant}
        onLowerHand={handleLowerHand}
        onMuteAll={() =>
          toast.show(
            'Muting everyone needs host controls on the server — not deployed yet.',
            'info'
          )
        }
        onClose={() => setShowParticipants(false)}
      />

      {/* Rate Your Tutor */}
      <Modal visible={showRateTutor} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#111827', borderRadius: 20, borderWidth: 1, borderColor: '#1F2937', padding: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Rate Your Tutor ⭐</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
              How was your session with {activeHostName}?
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRateValue(star)}>
                  <Ionicons
                    name={star <= rateValue ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= rateValue ? '#FBBF24' : '#4B5563'}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              value={rateComment}
              onChangeText={setRateComment}
              placeholder="Optional feedback for your tutor..."
              placeholderTextColor="#6B7280"
              multiline
              style={{
                backgroundColor: '#1F2937',
                color: '#FFFFFF',
                borderRadius: 10,
                padding: 12,
                minHeight: 70,
                textAlignVertical: 'top',
                fontSize: 13,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={handleSkipReview}
                style={({ pressed }) => [
                  { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#1F2937' },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 13 }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitReview}
                style={({ pressed }) => [
                  { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#3B82F6' },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Submit Review (+15 Pts)</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

