import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recordSessionAttendance } from '@/lib/supabase';
import { LocalPreviewProvider } from './localPreviewProvider';
import { JoinRoomOptions, VideoProvider, VideoRoomState } from './types';

export * from './types';

/**
 * The active video provider.
 *
 * LiveKit is native code that only exists in a development build. This module
 * is reachable from App.tsx's import graph, so constructing the provider at
 * module scope would evaluate LiveKit — and therefore WebRTC's native module —
 * on every app launch, including in Expo Go where it does not exist.
 *
 * Constructing lazily means nothing outside the session lobby ever touches
 * LiveKit: in Expo Go every other screen runs with no video code loaded at all,
 * and only opening a session falls back to the camera-preview provider.
 * See docs/VIDEO.md.
 */
let activeProvider: VideoProvider | null = null;

export function getVideoProvider(): VideoProvider {
  if (activeProvider) return activeProvider;

  try {
    // Inline require so Metro does not hoist this to module-evaluation time.
    const { LiveKitProvider } = require('./livekitProvider');
    activeProvider = new LiveKitProvider() as VideoProvider;
  } catch (err) {
    console.warn(
      '[video] LiveKit is unavailable (development build required). ' +
        'Falling back to camera preview.',
      err
    );
    activeProvider = new LocalPreviewProvider();
  }

  return activeProvider;
}

/** Test seam: forces the next getVideoProvider() to re-resolve. */
export function resetVideoProvider(): void {
  activeProvider = null;
}

/**
 * Binds a session screen to the active provider.
 *
 * Joining also records attendance, which is what makes progress tracking
 * (SRS 3.9) possible — it is deliberately here rather than in the screen so it
 * cannot be forgotten when the provider is swapped.
 */
export function useVideoRoom(options: JoinRoomOptions) {
  const provider = getVideoProvider();
  const [state, setState] = useState<VideoRoomState>(provider.getState());
  const joinedRef = useRef(false);

  const { sessionId, displayName, avatar, startMuted, startWithCameraOff } = options;

  useEffect(() => {
    const unsubscribe = provider.subscribe(setState);
    return unsubscribe;
  }, [provider]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (joinedRef.current) return;
      joinedRef.current = true;
      try {
        await provider.join({ sessionId, displayName, avatar, startMuted, startWithCameraOff });
        if (!cancelled && sessionId) {
          await recordSessionAttendance(sessionId);
        }
      } catch (err) {
        console.warn('Video join error:', err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      joinedRef.current = false;
      provider.leave().catch(() => {});
    };
    // Reconnect only when the room itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, sessionId]);

  const local = useMemo(
    () => state.participants.find((p) => p.isLocal) ?? null,
    [state.participants]
  );
  const remotes = useMemo(
    () => state.participants.filter((p) => !p.isLocal),
    [state.participants]
  );

  const setMuted = useCallback((muted: boolean) => provider.setMuted(muted), [provider]);
  const setCameraEnabled = useCallback(
    (enabled: boolean) => provider.setCameraEnabled(enabled),
    [provider]
  );
  const switchCamera = useCallback(() => provider.switchCamera(), [provider]);
  const setHandRaised = useCallback(
    (raised: boolean) => provider.setHandRaised(raised),
    [provider]
  );

  return {
    status: state.status,
    error: state.error,
    participants: state.participants,
    local,
    remotes,
    supportsRemoteMedia: provider.supportsRemoteMedia,
    providerId: provider.id,
    setMuted,
    setCameraEnabled,
    switchCamera,
    setHandRaised,
  };
}
