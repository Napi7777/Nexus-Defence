import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { HeaderBar, Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/context/AppStoreContext';
import { brand, DEFAULT_AVATAR } from '@/data/mockData';
import { styles } from '@/styles/appStyles';
import { AuthError, AuthInput, AuthButton } from './components/AuthFields';

export function SigninScreen({
  onBack,
  onContinue,
  onSignUpClick,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSignUpClick: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  useEffect(() => {
    setTimeout(() => {
      emailRef.current?.focus();
    }, 100);
  }, []);

  const handleSignin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const { signInWithEmail, fetchUserProfile, hasSupabaseEnv } = await import('../../lib/supabase');

      // No Supabase project is wired up in this build at all — there is
      // nothing to authenticate against, so this is a local demo run, not a
      // real account. That is the ONLY case that gets waved through: a real
      // sign-in attempt that simply fails (wrong password, unknown email, a
      // network hiccup) must never fall back into the app unauthenticated —
      // that used to be exactly what happened here, silently defeating
      // "Unauthorized users must be restricted" (SRS 3.2).
      if (!hasSupabaseEnv) {
        updateProfile({
          name: email.split('@')[0] || 'Student Learner',
          email: email.trim(),
          avatar: DEFAULT_AVATAR,
        });
        setLoading(false);
        onContinue();
        return;
      }

      const { data, error } = await signInWithEmail(email.trim(), password);

      if (error || !data?.user) {
        setErrorMsg(error?.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      const liveProfile = await fetchUserProfile(data.user.id);
      if (liveProfile) {
        updateProfile(liveProfile);
      } else {
        updateProfile({
          name: data.user.user_metadata?.full_name || email.split('@')[0] || 'User',
          email: data.user.email || email,
          avatar: DEFAULT_AVATAR,
        });
      }
      setLoading(false);
      onContinue();
    } catch (err: any) {
      // A thrown exception (network failure, a bad response, anything else
      // unexpected) is not proof of identity either — show it and stay put.
      setErrorMsg(err?.message || 'Sign in failed. Check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.authScreen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.formScreen,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar title="Sign In" onBack={onBack} light />

          <Text style={[styles.sectionHeadline, { color: brand.text }]}>Welcome back</Text>
          <Text style={[styles.sectionSubline, { color: brand.muted }]}>Sign in to access your communities and sessions.</Text>

          {errorMsg ? <AuthError message={errorMsg} /> : null}

          <AuthInput
            ref={emailRef}
            label="University Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@unimail.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AuthInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (email.trim() && password.trim()) {
                handleSignin();
              }
            }}
          />

          <AuthButton
            label={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleSignin}
            disabled={!email.trim() || !password.trim()}
            loading={loading}
          />

          <Pressable onPress={onSignUpClick} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.helperCenterText}>
              Don't have an account? <Text style={styles.helperLink}>Create one</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
