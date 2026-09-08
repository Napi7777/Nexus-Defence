import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '@/data/mockData';
import { styles } from '@/styles/appStyles';

// brand.secondary (#F4F2EE) as rgb, so the hero fade lands exactly on the body colour.
const CREAM_FADE = ['rgba(244,242,238,0)', 'rgba(244,242,238,0.75)', 'rgba(244,242,238,1)'] as const;

const ONBOARDING_SLIDES = [
  {
    title: 'Peer-to-Peer Learning',
    copy: 'Connect with top-rated tutors and student study groups across your university campus.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Live Study Sessions & Meetups',
    copy: 'Schedule virtual lobbies or meet up in person at campus libraries and study lounges.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Earn Perks & Track Streaks',
    copy: 'Level up your study rank, earn XP points, and unlock free campus coffee vouchers.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  },
];

export function OnboardingScreen({
  onSkip,
  onDone,
}: {
  onSkip: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  // One native-driven value powers the hero and body (transform + opacity only,
  // so it can stay off the JS thread). The dots need animated width and colour,
  // which the native driver cannot do, so they read a JS-side mirror fed by the
  // same scroll event.
  const scrollX = useRef(new Animated.Value(0)).current;
  const dotsX = useRef(new Animated.Value(0)).current;

  const [index, setIndex] = useState(0);
  const [chromeHeight, setChromeHeight] = useState(0);

  const heroHeight = Math.round(height * 0.58);
  const parallax = width * 0.1;
  const lastIndex = ONBOARDING_SLIDES.length - 1;
  const isLast = index === lastIndex;

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (event: any) => dotsX.setValue(event.nativeEvent.contentOffset.x),
      }),
    [scrollX, dotsX]
  );

  // Each slide reacts to the window one page either side of itself.
  const rangeFor = useCallback((i: number) => [(i - 1) * width, i * width, (i + 1) * width], [width]);

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  // Cross-fade the button label across the final page turn rather than snapping it.
  const ctaSwap = { inputRange: [(lastIndex - 1) * width, lastIndex * width], extrapolate: 'clamp' as const };

  return (
    <View style={styles.authScreen}>
      <StatusBar style="light" />

      {/* Hero layer sits behind the pager: images cross-fade and drift at a
          slower rate than the swipe, which is what sells the depth. */}
      <View style={[styles.onboardingHeroLayer, { height: heroHeight }]} pointerEvents="none">
        {ONBOARDING_SLIDES.map((slide, i) => (
          <Animated.Image
            key={slide.image}
            source={{ uri: slide.image }}
            resizeMode="cover"
            style={[
              styles.onboardingHeroImage,
              {
                opacity: scrollX.interpolate({ inputRange: rangeFor(i), outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                transform: [
                  {
                    translateX: scrollX.interpolate({
                      inputRange: rangeFor(i),
                      outputRange: [parallax, 0, -parallax],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    scale: scrollX.interpolate({
                      inputRange: rangeFor(i),
                      outputRange: [1.22, 1.08, 1.22],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
        <LinearGradient colors={CREAM_FADE} locations={[0, 0.62, 1]} style={styles.onboardingFade} />
      </View>

      <Animated.ScrollView
        ref={scrollRef as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        style={StyleSheet.absoluteFill}
      >
        {ONBOARDING_SLIDES.map((slide, i) => (
          <View key={slide.image} style={{ width }}>
            <View style={{ height: heroHeight }} />
            <Animated.View
              style={[
                styles.onboardingBody,
                { paddingBottom: chromeHeight + 12 },
                {
                  opacity: scrollX.interpolate({
                    inputRange: rangeFor(i),
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      translateY: scrollX.interpolate({
                        inputRange: rangeFor(i),
                        outputRange: [28, 0, 28],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.heroTitle}>{slide.title}</Text>
              <Text style={styles.onboardingCopy}>{slide.copy}</Text>
            </Animated.View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={[styles.onboardingTopBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={onSkip} style={styles.skipPill} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View
        style={[styles.onboardingChrome, { paddingBottom: insets.bottom + 24 }]}
        onLayout={(event) => setChromeHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.dotRow}>
          {ONBOARDING_SLIDES.map((slide, i) => (
            <Animated.View
              key={slide.image}
              style={[
                styles.dot,
                {
                  width: dotsX.interpolate({ inputRange: rangeFor(i), outputRange: [8, 24, 8], extrapolate: 'clamp' }),
                  backgroundColor: dotsX.interpolate({
                    inputRange: rangeFor(i),
                    outputRange: ['#D7D1C8', brand.primary, '#D7D1C8'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.onboardingCtaButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get Started' : 'Continue'}
        >
          <Animated.View
            style={[styles.onboardingCtaLayer, { opacity: scrollX.interpolate({ ...ctaSwap, outputRange: [1, 0] }) }]}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Animated.View>
          <Animated.View
            style={[styles.onboardingCtaLayer, { opacity: scrollX.interpolate({ ...ctaSwap, outputRange: [0, 1] }) }]}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}