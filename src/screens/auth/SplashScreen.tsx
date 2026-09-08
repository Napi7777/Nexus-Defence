import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '@/data/mockData';
import { styles } from '@/styles/appStyles';

/** How long the splash is shown, regardless of how fast the session resolves. */
const SPLASH_DURATION_MS = 3000;

export function SplashScreen({
  onDone,
  ready = true,
}: {
  onDone: () => void;
  /**
   * True once the launch route is known. The splash holds its exit animation
   * until then so the handoff is a crossfade into the real screen rather than a
   * fade to nothing while the session is still resolving.
   */
  ready?: boolean;
}) {
  const insets = useSafeAreaInsets();

  // Entrance: logo springs in, wordmark and tagline follow.
  const logoIn = useRef(new Animated.Value(0)).current;
  const brandIn = useRef(new Animated.Value(0)).current;
  const taglineIn = useRef(new Animated.Value(0)).current;
  // Three rings expanding outward on a stagger, so the mark feels alive.
  const rings = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  // Exit: the whole composition lifts and dissolves.
  const exit = useRef(new Animated.Value(0)).current;

  const settled = useRef(false);
  const [elapsed, setElapsed] = useState(false);

  const finish = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    Animated.timing(exit, {
      toValue: 1,
      duration: 420,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onDone());
  }, [exit, onDone]);

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoIn, {
        toValue: 1,
        damping: 11,
        stiffness: 150,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(brandIn, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(taglineIn, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Each ring loops on its own clock, offset so they chase one another.
    const loops = rings.map((value) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    );
    const starts = loops.map((loop, i) => setTimeout(() => loop.start(), i * 850));

    const timer = setTimeout(() => setElapsed(true), SPLASH_DURATION_MS);

    return () => {
      clearTimeout(timer);
      starts.forEach(clearTimeout);
      loops.forEach((loop) => loop.stop());
    };
  }, [logoIn, brandIn, taglineIn, rings, exit]);

  // Leave once the full duration has passed AND the launch route is known.
  useEffect(() => {
    if (elapsed && ready) finish();
  }, [elapsed, ready, finish]);

  const ringStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 0.45, 0],
    }),
    transform: [
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) },
    ],
  });

  return (
    <Animated.View
      style={[
        styles.splashRoot,
        StyleSheet.absoluteFill,
        {
          zIndex: 900,
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          ],
        },
      ]}
    >
      <StatusBar style="light" />
      <Pressable
        onPress={finish}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Skip splash screen"
      />

      <Animated.View style={[styles.splashRippleOne, ringStyle(rings[0])]} pointerEvents="none" />
      <Animated.View style={[styles.splashRippleTwo, ringStyle(rings[1])]} pointerEvents="none" />
      <Animated.View style={[styles.splashRippleThree, ringStyle(rings[2])]} pointerEvents="none" />

      <View style={styles.splashStack} pointerEvents="none">
        <Animated.View
          style={{
            opacity: logoIn,
            transform: [
              { scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            ],
          }}
        >
          <View style={styles.logoTile}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.splashBrand,
            {
              opacity: brandIn,
              transform: [
                { translateY: brandIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              ],
            },
          ]}
        >
          {brand.name}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.splashTagline,
            {
              opacity: taglineIn,
              transform: [
                { translateY: taglineIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          {brand.tagline}
        </Animated.Text>
      </View>

      <Animated.Text
        pointerEvents="none"
        style={[styles.splashHint, { bottom: insets.bottom + 28, opacity: taglineIn }]}
      >
        Tap to skip
      </Animated.Text>
    </Animated.View>
  );
}
