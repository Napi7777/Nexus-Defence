import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper over expo-haptics.
 *
 * Haptics are a no-op on web and can reject on devices without a taptic engine,
 * so every call is guarded — callers should never have to think about it.
 */

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<void>) {
  if (!enabled) return;
  run().catch(() => {
    /* device has no haptic hardware, or the user disabled system haptics */
  });
}

/** Tab changes, toggles, chip selection. */
export function tapLight() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Committing an action — join, RSVP, send. */
export function tapMedium() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Something completed successfully. */
export function notifySuccess() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A validation failure or blocked action. */
export function notifyError() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** A destructive or cautionary outcome. */
export function notifyWarning() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
