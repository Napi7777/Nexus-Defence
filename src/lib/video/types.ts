/**
 * Video provider contract (SRS 3.5 — Live Sessions).
 *
 * The PRD calls out third-party SDK cost and reliability as a live risk and
 * advises putting the integration behind an internal interface so providers can
 * be swapped. Everything the session lobby needs goes through this type, so the
 * screen never imports an SDK directly.
 */

export type VideoConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'disconnected';

export type VideoParticipant = {
  id: string;
  name: string;
  avatar?: string;
  /** True for the device running the app. */
  isLocal: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  isHandRaised: boolean;
  /** True only while this participant has an active, published screen-share track. */
  isScreenSharing: boolean;
  /**
   * Opaque handle the provider's renderer uses to draw this participant's
   * video. Null when there is no remote track to draw.
   */
  track?: unknown;
  /** Same idea as `track`, but for the shared-screen track. Undefined when not sharing. */
  screenShareTrack?: unknown;
};

export type VideoRoomState = {
  status: VideoConnectionStatus;
  participants: VideoParticipant[];
  /** Human-readable failure, safe to show the user. */
  error?: string;
};

export type JoinRoomOptions = {
  /** Session id — also used as the room name. */
  sessionId: string;
  displayName: string;
  avatar?: string;
  startMuted?: boolean;
  startWithCameraOff?: boolean;
};

export interface VideoProvider {
  /** Stable identifier, e.g. 'local-preview' or 'livekit'. */
  readonly id: string;

  /**
   * False when the provider cannot carry audio/video between devices.
   *
   * The lobby uses this to avoid presenting itself as a working call — the
   * screen previously showed a fabricated participant grid with no transport
   * behind it, which is exactly what this flag exists to prevent.
   */
  readonly supportsRemoteMedia: boolean;

  join(options: JoinRoomOptions): Promise<void>;
  leave(): Promise<void>;

  setMuted(muted: boolean): Promise<void>;
  setCameraEnabled(enabled: boolean): Promise<void>;
  switchCamera(): Promise<void>;
  setHandRaised(raised: boolean): Promise<void>;

  getState(): VideoRoomState;
  /** Returns an unsubscribe function. */
  subscribe(listener: (state: VideoRoomState) => void): () => void;
}
