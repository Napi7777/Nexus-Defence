import { registerGlobals } from '@livekit/react-native';
import {
  ConnectionState,
  Participant,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import { getSupabaseClient } from '@/lib/supabase';
import {
  JoinRoomOptions,
  VideoConnectionStatus,
  VideoParticipant,
  VideoProvider,
  VideoRoomState,
} from './types';

/**
 * LiveKit implementation of the video contract (SRS 3.5).
 *
 * Requires a development build — WebRTC is native code and cannot run in Expo
 * Go. See docs/VIDEO.md.
 */

// LiveKit needs WebRTC's globals installed before a Room is constructed. Safe to
// call more than once; guarded so a Fast Refresh does not repeat the work.
let globalsRegistered = false;
function ensureGlobals() {
  if (globalsRegistered) return;
  registerGlobals();
  globalsRegistered = true;
}

/**
 * Fetches a room token.
 *
 * Tokens are minted by the `livekit-token` Edge Function, never in the app — a
 * LiveKit API secret shipped in a bundle can be extracted and used to join any
 * room on the project.
 */
async function fetchRoomToken(
  sessionId: string,
  displayName: string
): Promise<{ url: string; token: string }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Not connected — sign in and try again.');

  const { data, error } = await client.functions.invoke('livekit-token', {
    body: { room: sessionId, name: displayName },
  });

  if (error) throw new Error(error.message || 'Could not join the session.');
  if (!data?.token || !data?.url) throw new Error('The session server did not return a token.');

  return { url: data.url, token: data.token };
}

function statusFor(state: ConnectionState): VideoConnectionStatus {
  switch (state) {
    case ConnectionState.Connecting:
      return 'connecting';
    case ConnectionState.Connected:
      return 'connected';
    case ConnectionState.Reconnecting:
      return 'reconnecting';
    case ConnectionState.Disconnected:
      return 'disconnected';
    default:
      return 'idle';
  }
}

export class LiveKitProvider implements VideoProvider {
  readonly id = 'livekit';
  readonly supportsRemoteMedia = true;

  private room: Room | null = null;
  private state: VideoRoomState = { status: 'idle', participants: [] };
  private listeners = new Set<(state: VideoRoomState) => void>();

  getState(): VideoRoomState {
    return this.state;
  }

  subscribe(listener: (state: VideoRoomState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(next: Partial<VideoRoomState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l(this.state));
  }

  private toParticipant(p: Participant, isLocal: boolean): VideoParticipant {
    const camera = p.getTrackPublication(Track.Source.Camera);
    const mic = p.getTrackPublication(Track.Source.Microphone);
    const screenShare = p.getTrackPublication(Track.Source.ScreenShare);

    return {
      id: p.identity,
      name: p.name || p.identity,
      avatar: p.attributes?.avatar,
      isLocal,
      isMuted: mic ? mic.isMuted : true,
      isCameraOn: Boolean(camera && !camera.isMuted),
      isSpeaking: p.isSpeaking,
      isHandRaised: p.attributes?.handRaised === 'true',
      // A publication with no subscribed track (remote side still buffering,
      // or the tab briefly paused) should not read as "sharing" — only a
      // publication that actually has bytes flowing counts.
      isScreenSharing: Boolean(screenShare && !screenShare.isMuted && screenShare.track),
      // Shaped as a LiveKit TrackReference so <VideoTrack trackRef> can consume
      // it directly. Typed `unknown` on the interface to keep the SDK out of
      // the shared contract.
      track: camera
        ? { participant: p, publication: camera, source: Track.Source.Camera }
        : undefined,
      screenShareTrack: screenShare
        ? { participant: p, publication: screenShare, source: Track.Source.ScreenShare }
        : undefined,
    };
  }

  /** Rebuilds the participant list from the room's current state. */
  private sync = () => {
    const room = this.room;
    if (!room) return;

    const remotes = Array.from(room.remoteParticipants.values()) as RemoteParticipant[];
    this.emit({
      status: statusFor(room.state),
      participants: [
        this.toParticipant(room.localParticipant, true),
        ...remotes.map((p) => this.toParticipant(p, false)),
      ],
    });
  };

  async join(options: JoinRoomOptions): Promise<void> {
    ensureGlobals();
    this.emit({ status: 'connecting', error: undefined });

    try {
      const { url, token } = await fetchRoomToken(options.sessionId, options.displayName);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;

      room
        .on(RoomEvent.ParticipantConnected, this.sync)
        .on(RoomEvent.ParticipantDisconnected, this.sync)
        .on(RoomEvent.TrackSubscribed, this.sync)
        .on(RoomEvent.TrackUnsubscribed, this.sync)
        .on(RoomEvent.TrackMuted, this.sync)
        .on(RoomEvent.TrackUnmuted, this.sync)
        .on(RoomEvent.LocalTrackPublished, this.sync)
        .on(RoomEvent.LocalTrackUnpublished, this.sync)
        .on(RoomEvent.ActiveSpeakersChanged, this.sync)
        .on(RoomEvent.ParticipantAttributesChanged, this.sync)
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          this.emit({ status: statusFor(state) });
        })
        .on(RoomEvent.Disconnected, () => {
          this.emit({ status: 'disconnected', participants: [] });
        });

      await room.connect(url, token);

      if (options.avatar) {
        await room.localParticipant.setAttributes({ avatar: options.avatar });
      }
      await room.localParticipant.setMicrophoneEnabled(!(options.startMuted ?? false));
      await room.localParticipant.setCameraEnabled(!(options.startWithCameraOff ?? false));

      this.sync();
    } catch (err: any) {
      this.emit({
        status: 'failed',
        participants: [],
        error: err?.message || 'Could not join the session.',
      });
      throw err;
    }
  }

  async leave(): Promise<void> {
    const room = this.room;
    this.room = null;

    if (room) {
      room.removeAllListeners();
      // Releases the camera; skipping this leaves the next join with a black tile.
      await room.disconnect();
    }
    this.emit({ status: 'disconnected', participants: [] });
  }

  async setMuted(muted: boolean): Promise<void> {
    await this.room?.localParticipant.setMicrophoneEnabled(!muted);
    this.sync();
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    await this.room?.localParticipant.setCameraEnabled(enabled);
    this.sync();
  }

  async switchCamera(): Promise<void> {
    const publication = this.room?.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = publication?.videoTrack;
    if (!track) return;

    const current = track.mediaStreamTrack.getSettings().facingMode;
    await track.restartTrack({ facingMode: current === 'environment' ? 'user' : 'environment' });
    this.sync();
  }

  async setHandRaised(raised: boolean): Promise<void> {
    // Attributes broadcast to the room, so every participant's roster updates.
    await this.room?.localParticipant.setAttributes({ handRaised: raised ? 'true' : 'false' });
    this.sync();
  }
}
