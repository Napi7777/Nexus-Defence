/**
 * Splash, onboarding, welcome, sign-up and sign-in.
 */
import { StyleSheet } from 'react-native';
import { brand } from '@/data/mockData';
import type { ThemeColors } from '../theme';

export const authStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    splashRippleOne: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.09)',
    },
    splashRippleTwo: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    splashRippleThree: {
      position: 'absolute',
      width: 380,
      height: 380,
      borderRadius: 190,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.07)',
    },
    logoTile: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    logoLetter: {
      fontSize: 34,
      fontWeight: '800',
      color: brand.primary,
    },
    splashBrand: {
      color: '#fff',
      fontSize: 34,
      fontWeight: '800',
    },
    splashTagline: {
      color: 'rgba(255,255,255,0.82)',
      marginTop: 8,
      fontSize: 15,
    },
    onboardingHeroLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      overflow: 'hidden',
    },
    onboardingHeroImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    coverImage: {
      resizeMode: 'cover',
    },
    onboardingTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 18,
    },
    skipPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(44,44,44,0.28)',
    },
    skipText: {
      color: '#fff',
      fontWeight: '700',
    },
    onboardingFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 210,
    },
    onboardingBody: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 6,
      gap: 12,
    },
    dotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#D7D1C8',
    },
    heroTitle: {
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '800',
      color: brand.text,
    },
    welcomeHero: {
      flex: 1,
    },
    welcomeTitle: {
      color: '#fff',
      fontSize: 38,
      lineHeight: 44,
      fontWeight: '800',
    },
    helperCenterText: {
      color: brand.muted,
      textAlign: 'center',
      fontSize: 14,
      marginTop: 6,
    },
    authScreen: {
      flex: 1,
      backgroundColor: brand.secondary,
    },
    authScreenDark: {
      flex: 1,
      backgroundColor: '#070918',
    },
    splashRoot: {
      flex: 1,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    splashStack: {
      alignItems: 'center',
    },
    splashHint: {
      position: 'absolute',
      alignSelf: 'center',
      color: 'rgba(255,255,255,0.70)',
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    onboardingCopy: {
      color: '#5A5A66',
      fontSize: 16,
      lineHeight: 24,
    },
    onboardingChrome: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 22,
      gap: 20,
    },
    onboardingCtaButton: {
      height: 58,
      borderRadius: 18,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    onboardingCtaLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeActions: {
      marginTop: 'auto',
      paddingHorizontal: 24,
      gap: 12,
    },
    welcomeTagline: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: 16,
      lineHeight: 24,
    },
    welcomeButtons: {
      marginTop: 10,
      gap: 12,
    },
    welcomeTerms: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 2,
    },
    outlineButtonOnDark: {
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.55)',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
    },
    outlineButtonTextOnDark: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    verifyCard: {
      backgroundColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      borderWidth: 1,
      padding: 18,
      borderRadius: 18,
      gap: 10,
      marginVertical: 10,
    },
    verifyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    verifyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: brand.text,
      flex: 1,
    },
    verifyBody: {
      fontSize: 13,
      color: brand.text,
      lineHeight: 19,
    },
  });
