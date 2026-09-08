import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar, PrimaryButton, Text } from '@/components/ui';
import { brand, NotificationPrefs } from '@/data/mockData';
import { styles } from '@/styles/appStyles';

export function NotificationPreferencesScreen({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved?: () => void;
}) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    sessionReminders: true,
    communityPosts: true,
    meetupUpdates: true,
    directMessages: true,
    badgesAndPoints: true,
    weeklyDigest: false,
    promotions: false,
  });

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <HeaderBar title="Notification Preferences" onBack={onBack} />
        <Text style={styles.sectionSubline}>Choose what updates you want to receive on mobile.</Text>

        <View style={styles.settingsCard}>
          <View style={[styles.preferenceRow, styles.preferenceRowBorder]}>
            <View style={styles.flexFill}>
              <Text style={styles.preferenceLabel}>New Session Broadcasts</Text>
              <Text style={styles.mutedCopySmall}>Get alerted when tutors launch live study sessions</Text>
            </View>
            <Switch
              value={prefs.sessionReminders}
              onValueChange={() => toggle('sessionReminders')}
              trackColor={{ true: brand.primary }}
            />
          </View>

          <View style={[styles.preferenceRow, styles.preferenceRowBorder]}>
            <View style={styles.flexFill}>
              <Text style={styles.preferenceLabel}>Direct Messages</Text>
              <Text style={styles.mutedCopySmall}>Alerts for chat messages from peers and tutors</Text>
            </View>
            <Switch
              value={prefs.directMessages}
              onValueChange={() => toggle('directMessages')}
              trackColor={{ true: brand.primary }}
            />
          </View>

          <View style={[styles.preferenceRow, styles.preferenceRowBorder]}>
            <View style={styles.flexFill}>
              <Text style={styles.preferenceLabel}>Community Post Replies</Text>
              <Text style={styles.mutedCopySmall}>Notifications when someone replies to your question</Text>
            </View>
            <Switch
              value={prefs.communityPosts}
              onValueChange={() => toggle('communityPosts')}
              trackColor={{ true: brand.primary }}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.flexFill}>
              <Text style={styles.preferenceLabel}>Weekly Study Digest</Text>
              <Text style={styles.mutedCopySmall}>Summary of your weekly learning hours and points</Text>
            </View>
            <Switch
              value={prefs.weeklyDigest}
              onValueChange={() => toggle('weeklyDigest')}
              trackColor={{ true: brand.primary }}
            />
          </View>
        </View>

        <PrimaryButton label="Save Preferences" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}
