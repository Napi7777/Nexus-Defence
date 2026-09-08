import React from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';
import { familyForWeight } from '@/styles/tokens';

/**
 * Drop-in replacement for react-native's `Text` that renders in Inter.
 *
 * Custom font families do not respond to `fontWeight` — you have to name the
 * face. Rather than rewriting every `fontWeight: '800'` in the stylesheet, this
 * flattens the incoming style, resolves the weight to the matching Inter face,
 * and clears `fontWeight` so Android does not also apply faux bolding on top.
 *
 * Screens import `Text` from here instead of from react-native.
 */
export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) as TextProps['style'] & { fontWeight?: any };
  const family = familyForWeight(flat?.fontWeight);
  return <RNText {...rest} style={[style, { fontFamily: family, fontWeight: undefined }]} />;
}

export type { TextProps };
