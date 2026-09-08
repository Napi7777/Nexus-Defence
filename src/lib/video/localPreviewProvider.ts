import {
  JoinRoomOptions,
  VideoProvider,
  VideoRoomState,
} from './types';

/**
 * The provider the app ships with until a real SDK is wired in.
 *
 * It manages exactly one participant: you. There is no signalling, no transport
 * and no remote media — `supportsRemoteMedia` is false so the UI can say so
 * plainly rather than implying a call is in progress.
 *
 * Replace it by setting the active provider in ./index.ts; nothing in the
 * session screen needs to change.
 */
export class LocalPreviewProvider implements VideoProvider {
  readonly id = 'local-preview';
  readonly supportsRemoteMedia = false;

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

  private patchLocal(patch: Partial<VideoRoomState['participants'][number]>) {
    this.emit({
      participants: this.state.participants.map((p) => (p.isLocal ? { ...p, ...patch } : p)),
    });
  }

  async join(options: JoinRoomOptions): Promise<void> {
    this.emit({ status: 'connecting', error: undefined });

    this.emit({
      status: 'connected',
      participants: [
        {
          id: 'local',
          name: options.displayName,
          avatar: options.avatar,
          isLocal: true,
          isMuted: options.startMuted ?? false,
          isCameraOn: !(options.startWithCameraOff ?? false),
          isSpeaking: false,
          isHandRaised: false,
          isScreenSharing: false,
        },
      ],
    });
  }

  async leave(): Promise<void> {
    this.emit({ status: 'disconnected', participants: [] });
  }

  async setMuted(muted: boolean): Promise<void> {
    this.patchLocal({ isMuted: muted });
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    this.patchLocal({ isCameraOn: enabled });
  }

  async switchCamera(): Promise<void> {
    // Facing is owned by the CameraView in the lobby; nothing to do here.
  }

  async setHandRaised(raised: boolean): Promise<void> {
    this.patchLocal({ isHandRaised: raised });
  }
}
