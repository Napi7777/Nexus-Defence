import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppStore } from '@/context/AppStoreContext';
import { useThemeColors } from '@/styles/appStyles';
import { radius, space, type } from '@/styles/tokens';
import { Text } from '@/components/ui/Text';

/* ------------------------------ Pull to refresh ---------------------------- */

/**
 * Themed RefreshControl bound to the store's refreshAll. Assign the result to a
 * scrollable's `refreshControl` prop.
 */
export function useRefreshControl() {
  const { isRefreshing, refreshAll } = useAppStore();
  const colors = useThemeColors();
  return (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={refreshAll}
      tintColor={colors.muted}
      colors={[colors.tabBarActive]}
      progressBackgroundColor={colors.card}
    />
  );
}

/* -------------------------------- Skeleton -------------------------------- */

/**
 * Shimmering placeholder block. Use while first-load data is in flight so the
 * screen reads as "loading" rather than "empty then suddenly different".
 */
export function Skeleton({
  height = 16,
  width,
  round = radius.xs,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const shimmer = useRef(new Animated.Value(0)).current;
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const base = colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)';
  const sweep = colors.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)';

  return (
    <View
      onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}
      style={[{ height, width, borderRadius: round, backgroundColor: base, overflow: 'hidden' }, style]}
    >
      {measured > 0 ? (
        <Animated.View
          style={{
            width: measured,
            height: '100%',
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-measured, measured],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={['transparent', sweep, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Card-shaped skeleton matching the app's list rows. */
export function SkeletonCard({ lines = 2, style }: { lines?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useThemeColors();
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <Skeleton height={44} width={44} round={radius.sm} />
      <View style={skeletonStyles.cardBody}>
        <Skeleton height={14} width="70%" />
        {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
          <Skeleton key={i} height={11} width={i % 2 === 0 ? '90%' : '55%'} />
        ))}
      </View>
    </View>
  );
}

/** Repeats SkeletonCard — drop straight into a list's loading branch. */
export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <View style={{ gap: space.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.lg,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: space.sm,
  },
});

/* ------------------------------- EmptyState ------------------------------- */

/**
 * Shown when a list has genuinely no content — distinct from the loading state
 * above, so the user is never left staring at blank space wondering which.
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={[emptyStyles.wrap, compact && emptyStyles.wrapCompact]}>
      <View style={[emptyStyles.iconRing, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name={icon} size={compact ? 22 : 28} color={colors.muted} />
      </View>
      <Text style={[emptyStyles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[emptyStyles.message, { color: colors.muted }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            emptyStyles.action,
            { borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[emptyStyles.actionText, { color: colors.tabBarActive }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  wrapCompact: {
    paddingVertical: space.xxl,
  },
  iconRing: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.subheading,
    textAlign: 'center',
  },
  message: {
    ...type.caption,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: space.xs,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionText: {
    ...type.bodyStrong,
  },
});
