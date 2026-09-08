import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Fades and lifts the active screen whenever the route changes, so pushes and
 * pops read as a transition rather than an instant swap.
 */
export function ScreenTransitionContainer({
  routeKey,
  children,
}: {
  routeKey: string;
  children: React.ReactNode;
}) {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    fadeAnim.setValue(0.3);
    translateY.setValue(14);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [routeKey]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
