import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { brand } from '@/data/mockData';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

/**
 * A real date/time picker built from plain RN primitives — no
 * `@react-native-community/datetimepicker` (it needs native config the user
 * would have to rebuild for) and no date library. Before this existed,
 * "Date & Time" on Schedule Session / Create Meetup was a free-text field
 * (SRS 3.5/3.6 both require a real date & time), so nothing typed there ever
 * became an actual timestamp — a session "scheduled" for literally any string
 * synced to the backend as `new Date().toISOString()`, i.e. "right now",
 * regardless of what the tutor typed.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_STEP = 15;

function startOfMinuteStep(d: Date): Date {
  const next = new Date(d);
  const rem = next.getMinutes() % MINUTE_STEP;
  if (rem !== 0) next.setMinutes(next.getMinutes() + (MINUTE_STEP - rem));
  next.setSeconds(0, 0);
  return next;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function StepperRow({
  icon,
  label,
  onPrev,
  onNext,
  prevDisabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 10,
      }}
    >
      <Pressable
        hitSlop={HIT_SLOP}
        onPress={onPrev}
        disabled={prevDisabled}
        style={({ pressed }) => [
          { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
          prevDisabled && { opacity: 0.35 },
          pressed && !prevDisabled && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color={brand.primary} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{label}</Text>
      </View>

      <Pressable
        hitSlop={HIT_SLOP}
        onPress={onNext}
        style={({ pressed }) => [
          { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  /** Defaults to "now" — a session or meetup cannot be scheduled in the past. */
  minimumDate?: Date;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const min = minimumDate ?? new Date();

  const openPicker = () => {
    setDraft(value < min ? startOfMinuteStep(min) : value);
    setOpen(true);
  };

  const clampToMin = (d: Date) => (d < min ? startOfMinuteStep(min) : d);

  const stepDay = (delta: number) => {
    setDraft((prev) => clampToMin(new Date(prev.getTime() + delta * DAY_MS)));
  };

  const stepMinutes = (delta: number) => {
    setDraft((prev) => {
      const next = new Date(prev);
      next.setMinutes(next.getMinutes() + delta * MINUTE_STEP);
      return clampToMin(next);
    });
  };

  const isAtMin = draft.getTime() <= min.getTime();

  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        hitSlop={HIT_SLOP}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDateLabel(value)} at ${formatTimeLabel(value)}. Tap to change.`}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 14,
            marginBottom: 14,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
          {formatDateLabel(value)} · {formatTimeLabel(value)}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            </View>

            <StepperRow
              icon="calendar-outline"
              label={formatDateLabel(draft)}
              onPrev={() => stepDay(-1)}
              onNext={() => stepDay(1)}
              prevDisabled={isAtMin}
            />
            <StepperRow
              icon="time-outline"
              label={formatTimeLabel(draft)}
              onPrev={() => stepMinutes(-1)}
              onNext={() => stepMinutes(1)}
              prevDisabled={isAtMin}
            />

            <Pressable
              hitSlop={HIT_SLOP}
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
              style={({ pressed }) => [
                { backgroundColor: brand.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Confirm Date & Time</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
