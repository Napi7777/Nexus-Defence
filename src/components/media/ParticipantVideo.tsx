import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DEFAULT_AVATAR } from '@/data/mockData';
import type { VideoParticipant } from '@/lib/video';
import { Avatar } from '@/components/ui/Avatar';

/**
 * Renders one participant's video tile.
 *
 * The LiveKit renderer is required lazily so this component still mounts in
 * Expo Go, where the native WebRTC module does not exist — it just falls back
 * to the avatar tile.
 */

let VideoTrackComponent: React.ComponentType<any> | null | undefined;

function getVideoTrack(): React.ComponentType<any> | null {
  if (VideoTrackComponent === undefined) {
    try {
      VideoTrackComponent = require('@livekit/react-native').VideoTrack;
    } catch {
      VideoTrackComponent = null;
    }
  }
  return VideoTrackComponent ?? null;
}

export function ParticipantVideo({
  participant,
  style,
  mirror,
}: {
  participant: VideoParticipant;
  style?: StyleProp<ViewStyle>;
  mirror?: boolean;
}) {
  const VideoTrack = getVideoTrack();
  const hasVideo = Boolean(participant.track) && participant.isCameraOn;

  if (hasVideo && VideoTrack) {
    return (
      <View style={[styles.tile, style]}>
        <VideoTrack
          trackRef={participant.track}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={mirror ?? participant.isLocal}
        />
        {participant.isMuted ? (
          <View style={styles.mutedBadge}>
            <Ionicons name="mic-off" size={12} color="#fff" />
          </View>
        ) : null}
      </View>
    );
  }

  // Camera off, or no track published yet.
  return (
    <View style={[styles.tile, styles.placeholder, style]}>
      <Avatar source={participant.avatar || DEFAULT_AVATAR} size={44} />
      {participant.isMuted ? (
        <View style={styles.mutedBadge}>
          <Ionicons name="mic-off" size={12} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17,24,39,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
