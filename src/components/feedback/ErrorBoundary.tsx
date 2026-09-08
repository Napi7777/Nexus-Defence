import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { brand } from '@/data/mockData';
import { radius, space, type } from '@/styles/tokens';
import { Text } from '@/components/ui/Text';

/**
 * Catches render errors so a single broken screen does not leave the user
 * staring at a white void (SRS 4.3 — "minimal crashes, graceful handling").
 *
 * Deliberately not themed: if the theme system is what threw, reading colours
 * from it here would throw again inside the fallback.
 */

type Props = {
  children: React.ReactNode;
  /** Called when the user chooses to recover. */
  onReset?: () => void;
};

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the component stack — the message alone rarely identifies the screen.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <View style={styles.badge}>
          <Ionicons name="warning-outline" size={26} color={brand.danger} />
        </View>

        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          This screen ran into a problem. Your account and saved work are fine — going back should
          put things right.
        </Text>

        {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}

        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
    backgroundColor: brand.secondary,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEA',
  },
  title: {
    ...type.heading,
    color: brand.text,
    textAlign: 'center',
  },
  body: {
    ...type.body,
    color: brand.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  detail: {
    ...type.caption,
    color: brand.danger,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: space.sm,
    backgroundColor: brand.primary,
    borderRadius: radius.md,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  buttonText: {
    ...type.bodyStrong,
    color: '#fff',
  },
});
