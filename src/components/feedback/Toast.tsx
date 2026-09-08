import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notifyError, notifySuccess, tapLight } from '@/lib/haptics';
import { radius, shadowLg, space, type } from '@/styles/tokens';
import { useThemeColors } from '@/styles/appStyles';
import { Text } from '@/components/ui/Text';

export type ToastVariant = 'success' | 'error' | 'info';

type ToastPayload = { id: number; message: string; variant: ToastVariant };

type ToastApi = {
  /** Show a transient confirmation. Fires the matching haptic automatically. */
  show: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastApi>({ show: () => {} });

/** Confirmation toasts. Call from anywhere under <ToastProvider>. */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const VISIBLE_MS = 2600;

const ICONS: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const ACCENTS: Record<ToastVariant, string> = {
  success: '#59B980',
  error: '#E45A4F',
  info: '#2C2FA3',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    if (variant === 'error') notifyError();
    else if (variant === 'success') notifySuccess();
    else tapLight();

    counter.current += 1;
    setToast({ id: counter.current, message, variant });
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <ToastCard
          key={toast.id}
          payload={toast}
          onDone={() => setToast((current) => (current && current.id === toast.id ? null : current))}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastCard({ payload, onDone }: { payload: ToastPayload; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const progress = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(onDone);
  }, [progress, onDone]);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [progress, dismiss]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + space.sm },
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={dismiss}
        accessibilityRole="alert"
        accessibilityLabel={payload.message}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadowLg]}
      >
        <View style={[styles.accent, { backgroundColor: ACCENTS[payload.variant] }]} />
        <Ionicons name={ICONS[payload.variant]} size={20} color={ACCENTS[payload.variant]} />
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {payload.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  message: {
    flex: 1,
    ...type.bodyStrong,
  },
});
