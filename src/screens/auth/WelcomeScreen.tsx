import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ImageBackground,
  Pressable,
  View,
} from 'react-native';
import { PrimaryButton, Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '@/data/mockData';
import { styles } from '@/styles/appStyles';

export function WelcomeScreen({
  onCreateAccount,
  onSignIn,
}: {
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.authScreenDark}>
      <StatusBar style="light" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.welcomeHero}
        imageStyle={styles.coverImage}
      >
        <LinearGradient
          colors={['rgba(7,9,24,0.15)', 'rgba(7,9,24,0.55)', 'rgba(7,9,24,0.95)']}
          locations={[0, 0.45, 1]}
          style={styles.flexFill}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 18 }}>
            <Text style={styles.splashBrand}>{brand.name}</Text>
          </View>

          <View style={[styles.welcomeActions, { paddingBottom: insets.bottom + 28 }]}>
            <Text style={styles.welcomeTitle}>Find your study community</Text>
            <Text style={styles.welcomeTagline}>
              Connect with university peers, share study materials, and excel together.
            </Text>

            <View style={styles.welcomeButtons}>
              <PrimaryButton label="Create Account" onPress={onCreateAccount} />
              <Pressable
                onPress={onSignIn}
                style={({ pressed }) => [
                  styles.outlineButtonOnDark,
                  pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign In"
              >
                <Text style={styles.outlineButtonTextOnDark}>Sign In</Text>
              </Pressable>
            </View>

            <Text style={styles.welcomeTerms}>
              By continuing you agree to the {brand.name} community guidelines.
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
