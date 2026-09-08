import { Ionicons } from '@expo/vector-icons';
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

export function SignupScreen({
  onBack,
  onContinue,
  onSignInClick,
}: {
  onBack: () => void;
  onContinue: () => void;
  onSignInClick: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useAppStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<'Student' | 'Tutor'>('Student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const nameRef = useRef<any>(null);
  const universityRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  useEffect(() => {
    if (step === 1) {
      setTimeout(() => {
        nameRef.current?.focus();
      }, 100);
    } else if (step === 2) {
      setTimeout(() => {
        universityRef.current?.focus();
      }, 100);
    } else if (step === 3) {
      setTimeout(() => {
        passwordRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const isEmailValid = (emailStr: string) => {
    const trimmed = emailStr.trim();
    return trimmed.length > 0 && trimmed.includes('@') && trimmed.includes('.');
  };

  const isStep1Valid = () => name.trim().length > 0;
  const isStep2Valid = () => university.trim().length > 0 && isEmailValid(email);
  const isStep3Valid = () => password.length >= 8;

  const handleNextStep = () => {
    if (step === 1 && isStep1Valid()) {
      setStep(2);
    } else if (step === 2 && isStep2Valid()) {
      setStep(3);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    } else {
      onBack();
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return {
          title: `Join ${brand.name}`,
          subtitle: 'Choose your role and enter your name.',
        };
      case 2:
        return {
          title: 'Where do you study?',
          subtitle: 'Enter your university details.',
        };
      case 3:
        return {
          title: 'Secure your account',
          subtitle: 'Choose a password of at least 8 characters.',
        };
    }
  };
  const stepContent = getStepContent();

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in your name, email, and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const { signUpWithEmail } = await import('../../lib/supabase');
      const { data, error } = await signUpWithEmail(email.trim(), password, name.trim());

      const isApiKeyErr = Boolean(
        error &&
        (error.message?.toLowerCase().includes('api key') ||
         error.message?.toLowerCase().includes('apikey') ||
         error.message?.toLowerCase().includes('not configured'))
      );

      if (error && !isApiKeyErr) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      updateProfile({
        name: name.trim(),
        email: email.trim(),
        university: university.trim() || 'KNUST',
        major: role === 'Tutor' ? 'Peer Tutor' : 'Computer Science',
        year: '1st Year',
        bio: `Joined Learning Commons as ${role} from ${university.trim() || 'KNUST'}.`,
        skills: role === 'Tutor' ? ['Peer Tutoring', 'Mentorship'] : ['Collaborative Study', 'Group Learning'],
        points: 100,
        sessions: 0,
        communities: 1,
        streak: '1 day',
        avatar: DEFAULT_AVATAR,
      });

      // Check if Supabase sent an email confirmation link
      if (data?.user && !data.session && !isApiKeyErr) {
        setVerificationSent(true);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      const isApiKeyErr = Boolean(
        err.message?.toLowerCase().includes('api key') ||
        err.message?.toLowerCase().includes('apikey') ||
        err.message?.toLowerCase().includes('not configured')
      );

      if (!isApiKeyErr) {
        setErrorMsg(err.message || 'Signup failed.');
        setLoading(false);
        return;
      }

      updateProfile({
        name: name.trim(),
        email: email.trim(),
        university: university.trim() || 'KNUST',
        major: role === 'Tutor' ? 'Peer Tutor' : 'Computer Science',
        year: '1st Year',
        bio: `Joined Learning Commons as ${role} from ${university.trim() || 'KNUST'}.`,
        skills: role === 'Tutor' ? ['Peer Tutoring', 'Mentorship'] : ['Collaborative Study', 'Group Learning'],
        points: 100,
        sessions: 0,
        communities: 1,
        streak: '1 day',
        avatar: `https://i.pravatar.cc/120?u=${encodeURIComponent(email.trim())}`,
      });
    }

    setLoading(false);
    onContinue();
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
          <HeaderBar title="Create Account" onBack={handleBackStep} light />

          <Text style={[styles.sectionHeadline, { color: brand.text }]}>{stepContent.title}</Text>
          <Text style={[styles.sectionSubline, { color: brand.muted }]}>{stepContent.subtitle}</Text>

          {/* Progress Tracker */}
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 14 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step >= 1 ? brand.primary : '#EAE5DE' }} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step >= 2 ? brand.primary : '#EAE5DE' }} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step >= 3 ? brand.primary : '#EAE5DE' }} />
          </View>

          {verificationSent ? (
            <View style={[styles.verifyCard, { borderRadius: 8, padding: 16, borderColor: brand.border, backgroundColor: '#FFF' }]}>
              <View style={styles.verifyRow}>
                <Ionicons name="mail-unread" size={24} color={brand.primary} />
                <Text style={[styles.verifyTitle, { fontSize: 16, fontWeight: '700' }]}>Check your email inbox</Text>
              </View>
              <Text style={[styles.verifyBody, { fontSize: 14, color: brand.text, lineHeight: 20, marginTop: 8 }]}>
                We sent a verification link to <Text style={{ fontWeight: '700' }}>{email}</Text>. Open it to confirm your
                account, then sign in below.
              </Text>
              <View style={{ marginTop: 12 }}>
                <AuthButton label="Proceed to Sign In" onPress={onSignInClick} />
              </View>
            </View>
          ) : (
            <>
              {errorMsg ? <AuthError message={errorMsg} /> : null}

              {step === 1 && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: brand.text, marginBottom: 8 }}>I am a:</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {(['Student', 'Tutor'] as const).map((item) => {
                      const active = role === item;
                      return (
                        <Pressable
                          key={item}
                          onPress={() => setRole(item)}
                          style={{
                            flex: 1,
                            paddingVertical: 14,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: active ? brand.primary : '#E8E4DE',
                            backgroundColor: active ? brand.primary : '#fff',
                            alignItems: 'center',
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`Sign up as ${item}`}
                        >
                          <Text
                            style={{
                              fontWeight: '700',
                              fontSize: 15,
                              color: active ? '#fff' : brand.muted,
                            }}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <AuthInput
                    ref={nameRef}
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Seyram Mensah"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={handleNextStep}
                  />

                  <AuthButton
                    label="Continue"
                    onPress={handleNextStep}
                    disabled={!isStep1Valid()}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <AuthInput
                    ref={universityRef}
                    label="University"
                    value={university}
                    onChangeText={setUniversity}
                    placeholder="e.g. KNUST"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />

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
                    onSubmitEditing={handleNextStep}
                  />

                  <AuthButton
                    label="Continue"
                    onPress={handleNextStep}
                    disabled={!isStep2Valid()}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <AuthInput
                    ref={passwordRef}
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 8 characters"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (isStep3Valid()) {
                        handleSignup();
                      }
                    }}
                  />

                  <AuthButton
                    label={loading ? 'Creating Account...' : 'Create Account'}
                    onPress={handleSignup}
                    disabled={!isStep3Valid()}
                    loading={loading}
                  />
                </>
              )}

              {step === 1 && (
                <Pressable onPress={onSignInClick} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.helperCenterText}>
                    Already have an account? <Text style={styles.helperLink}>Sign in</Text>
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
