import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { notifyError } from '@/lib/haptics';
import { reportContent, ReportTarget } from '@/lib/supabase';
import { useThemeColors } from '@/styles/appStyles';
import { radius, space, type } from '@/styles/tokens';
import { useToast } from '@/components/feedback/Toast';
import { Text } from '@/components/ui/Text';

/**
 * Report flow for user-generated content (SRS 3.12).
 *
 * The PRD calls for at least a report-and-review path even in the MVP, ahead of
 * full admin tooling — this is the reporting half; the queue is the review half.
 */

const REASONS = [
  'Harassment or bullying',
  'Spam or advertising',
  'Inappropriate or explicit content',
  'Misinformation',
  'Academic dishonesty',
  'Something else',
];

export function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTarget;
  targetId: string;
  /** What is being reported, shown so the user knows they picked the right thing. */
  targetLabel?: string;
}) {
  const colors = useThemeColors();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (reason: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await reportContent(targetType, targetId, reason);
      if (error) throw error;
      toast.show('Report sent. Our moderators will review it.');
      onClose();
    } catch (err: any) {
      notifyError();
      toast.show(err?.message || 'Could not send that report. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={sheetStyles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close report options"
      />
      <View style={[sheetStyles.sheet, { backgroundColor: colors.card }]}>
        <View style={sheetStyles.header}>
          <View style={sheetStyles.flexFill}>
            <Text style={[sheetStyles.title, { color: colors.text }]}>Report this {targetType}</Text>
            {targetLabel ? (
              <Text style={[sheetStyles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                {targetLabel}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close-circle" size={26} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={[sheetStyles.prompt, { color: colors.muted }]}>
          Tell us what is wrong. Reports are private — the person you report is not told who
          reported them.
        </Text>

        {REASONS.map((reason) => (
          <Pressable
            key={reason}
            onPress={() => submit(reason)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={reason}
            style={({ pressed }) => [
              sheetStyles.reason,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
              submitting && { opacity: 0.5 },
            ]}
          >
            <Text style={[sheetStyles.reasonText, { color: colors.text }]}>{reason}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const sheetStyles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(7,9,24,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flexFill: { flex: 1 },
  title: { ...type.subheading },
  subtitle: { ...type.caption, marginTop: 2 },
  prompt: { ...type.caption, marginBottom: space.sm },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  reasonText: { ...type.body, flex: 1 },
} as const;
