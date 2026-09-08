import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, SkeletonList, useToast } from '@/components/feedback';
import { HeaderBar, Text } from '@/components/ui';
import {
  deleteReportedContent,
  getOpenReports,
  ModerationReport,
  ReportTarget,
  resolveReport,
  setUserBanned,
} from '@/lib/supabase';
import { styles, useThemeColors } from '@/styles/appStyles';
import { modStyles } from './moderationStyles';

export function ModerationScreen({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const toast = useToast();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await getOpenReports();
    setReports(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (report: ModerationReport, status: 'resolved' | 'dismissed') => {
    if (busyId) return;
    setBusyId(report.id);
    try {
      const { error } = await resolveReport(report.id, status);
      if (error) throw error;
      // Drop it locally rather than refetching the whole queue.
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.show(status === 'resolved' ? 'Report resolved' : 'Report dismissed');
    } catch (err: any) {
      toast.show(err?.message || 'Could not update that report.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveContent = async (report: ModerationReport) => {
    if (busyId) return;
    setBusyId(report.id);
    try {
      const { error } = await deleteReportedContent(
        report.targetType as ReportTarget,
        report.targetId
      );
      if (error) throw error;
      const { error: resolveError } = await resolveReport(report.id, 'resolved');
      if (resolveError) throw resolveError;
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.show('Content removed');
    } catch (err: any) {
      toast.show(err?.message || 'Could not remove that content.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspendUser = async (report: ModerationReport) => {
    if (busyId) return;
    setBusyId(report.id);
    try {
      const { error } = await setUserBanned(report.targetId, true);
      if (error) throw error;
      const { error: resolveError } = await resolveReport(report.id, 'resolved');
      if (resolveError) throw resolveError;
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.show('Account suspended');
    } catch (err: any) {
      toast.show(err?.message || 'Could not suspend that account.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemoveContent = (report: ModerationReport) => {
    Alert.alert(
      'Remove this content?',
      'This deletes the reported item permanently and resolves the report.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => handleRemoveContent(report) },
      ]
    );
  };

  const confirmSuspendUser = (report: ModerationReport) => {
    Alert.alert(
      'Suspend this account?',
      'The user will be signed out and blocked from posting, messaging or sharing until an admin restores them.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => handleSuspendUser(report) },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.lightScreen, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <HeaderBar title="Moderation" onBack={onBack} />
        <Text style={styles.sectionSubline}>
          Reports from across the platform. Resolving removes an item from the queue; dismissing
          marks it as no action needed.
        </Text>

        {loading ? (
          <SkeletonList count={3} lines={2} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Nothing to review"
            message="Reported posts, messages and profiles will appear here."
          />
        ) : (
          reports.map((report) => (
            <View
              key={report.id}
              style={[
                modStyles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={modStyles.row}>
                <View style={modStyles.badge}>
                  <Text style={modStyles.badgeText}>{report.targetType}</Text>
                </View>
                <Text style={[modStyles.date, { color: colors.muted }]}>
                  {new Date(report.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={[modStyles.reason, { color: colors.text }]}>{report.reason}</Text>
              <Text style={[modStyles.targetId, { color: colors.muted }]} numberOfLines={1}>
                {report.targetId}
              </Text>

              <View style={modStyles.actions}>
                <Pressable
                  onPress={() => handleResolve(report, 'dismissed')}
                  disabled={busyId === report.id}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss this report"
                  style={({ pressed }) => [
                    modStyles.action,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[modStyles.actionText, { color: colors.muted }]}>Dismiss</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleResolve(report, 'resolved')}
                  disabled={busyId === report.id}
                  accessibilityRole="button"
                  accessibilityLabel="Mark this report resolved"
                  style={({ pressed }) => [
                    modStyles.action,
                    modStyles.actionPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[modStyles.actionText, { color: '#fff' }]}>Resolve</Text>
                </Pressable>

                {(report.targetType === 'post' ||
                  report.targetType === 'comment' ||
                  report.targetType === 'message') && (
                  <Pressable
                    onPress={() => confirmRemoveContent(report)}
                    disabled={busyId === report.id}
                    accessibilityRole="button"
                    accessibilityLabel="Remove the reported content"
                    style={({ pressed }) => [
                      modStyles.action,
                      modStyles.actionDestructive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[modStyles.actionText, { color: '#fff' }]}>Remove Content</Text>
                  </Pressable>
                )}

                {report.targetType === 'profile' && (
                  <Pressable
                    onPress={() => confirmSuspendUser(report)}
                    disabled={busyId === report.id}
                    accessibilityRole="button"
                    accessibilityLabel="Suspend this account"
                    style={({ pressed }) => [
                      modStyles.action,
                      modStyles.actionDestructive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[modStyles.actionText, { color: '#fff' }]}>Suspend Account</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
