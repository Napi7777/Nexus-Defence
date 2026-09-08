/** Text entry: a labelled field for forms and a compact search box. */
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';

import { Text } from './Text';
import { brand } from '@/data/mockData';
import { styles, useThemeColors } from '@/styles/appStyles';
import { HIT_SLOP } from '@/styles/tokens';

export function LabelledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  keyboardType,
  light,
  autoCapitalize,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
  /** Pin to the light pre-auth palette instead of following the app theme. */
  light?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}) {
  const colors = useThemeColors();
  const [revealed, setRevealed] = useState(false);
  const isSecure = Boolean(secureTextEntry);

  const palette = light
    ? { text: brand.text, muted: brand.muted, inputBg: '#ECE7E0', border: brand.border }
    : { text: colors.text, muted: colors.muted, inputBg: colors.inputBg, border: colors.border };

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: palette.text }]}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          secureTextEntry={isSecure && !revealed}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCapitalize === 'none' ? false : undefined}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[
            styles.input,
            light ? styles.inputLight : undefined,
            { backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.border },
            multiline ? styles.inputMultiline : undefined,
            isSecure ? styles.inputWithAction : undefined,
          ]}
        />
        {isSecure ? (
          <Pressable
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={styles.inputAction}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function SearchInput({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
      <Ionicons name="search-outline" size={18} color={colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        style={{ flex: 1, fontSize: 14, color: colors.text, marginLeft: 8 }}
      />
    </View>
  );
}
