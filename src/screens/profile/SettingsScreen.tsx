import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionRow, HeaderBar, Text, ThemePicker } from '@/components/ui';
import { styles } from '@/styles/appStyles';

/**
 * App-wide settings. Appearance (system/light/dark/midnight) lives here, not
 * on the Profile screen — Profile is the user's public-facing card, while
 * this is where device-level preferences belong. Account-level preferences
 * (profile details, password/security, notifications) are consolidated here
 * too, so Settings is the one place for "how NEXUS behaves for me" and
 * Profile stays focused on the public card + reviews.
 */
export function SettingsScreen({
  onBack,
  onEditProfile,
  onChangePassword,
  onNotificationPreferences,
}: {
  onBack: () => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onNotificationPreferences: () => void;
}) {
  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <HeaderBar title="Settings" onBack={onBack} />
        <Text style={styles.sectionSubline}>Manage how NEXUS looks and behaves on this device.</Text>

        <ThemePicker />

        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Account</Text>
        <ActionRow label="Edit Profile" onPress={onEditProfile} icon="person-outline" />
        <ActionRow label="Privacy & Security" onPress={onChangePassword} icon="shield-checkmark-outline" />
        <ActionRow
          label="Notification Preferences"
          onPress={onNotificationPreferences}
          icon="notifications-outline"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
