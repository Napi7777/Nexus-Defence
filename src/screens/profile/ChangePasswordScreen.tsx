import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback';
import { HeaderBar, LabelledInput, PrimaryButton, Text } from '@/components/ui';
import { notifyError } from '@/lib/haptics';
import { styles } from '@/styles/appStyles';

export function ChangePasswordScreen({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved?: () => void;
}) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // The button used to call onBack() and nothing else — the screen collected
  // three passwords and discarded them.
  const handleUpdatePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      setError('Fill in all three fields.');
      return;
    }
    if (newPass.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPass === currentPass) {
      setError('Your new password must be different from the current one.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { changePassword } = await import('../../lib/supabase');
      const { error: changeError } = await changePassword(currentPass, newPass);
      if (changeError) {
        setError(changeError.message);
        notifyError();
        return;
      }
      toast.show('Password updated');
      onSaved?.();
      onBack();
    } catch (err: any) {
      setError(err?.message || 'Could not update your password. Try again.');
      notifyError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.lightScreen}>
      <ScrollView contentContainerStyle={styles.formScreen}>
        <HeaderBar title="Change Password" onBack={onBack} />
        <Text style={styles.sectionSubline}>Keep your NEXUS account secure with a strong password.</Text>

        <LabelledInput
          label="Current Password"
          value={currentPass}
          onChangeText={setCurrentPass}
          placeholder="Enter current password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          light
        />
        <LabelledInput
          label="New Password"
          value={newPass}
          onChangeText={setNewPass}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          light
        />
        <LabelledInput
          label="Confirm New Password"
          value={confirmPass}
          onChangeText={setConfirmPass}
          placeholder="Re-enter new password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          light
        />

        {error ? (
          <View style={styles.authErrorBox}>
            <Ionicons name="alert-circle" size={18} color="#8C2F27" />
            <Text style={styles.authErrorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={saving ? 'Updating...' : 'Update Password'}
          onPress={handleUpdatePassword}
          loading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
