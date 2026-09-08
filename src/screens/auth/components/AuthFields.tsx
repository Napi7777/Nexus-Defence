import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Text } from '@/components/ui';
import { brand } from '@/data/mockData';
import { styles } from '@/styles/appStyles';

export function AuthError({ message }: { message: string }) {
  return (
    <View style={styles.authErrorBox}>
      <Ionicons name="alert-circle" size={18} color="#8C2F27" />
      <Text style={styles.authErrorText}>{message}</Text>
    </View>
  );
}

export const AuthInput = React.forwardRef<any, {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}>(({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
}, ref) => {
  const [revealed, setRevealed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isSecure = Boolean(secureTextEntry);

  return (
    <View style={{ gap: 6, marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: brand.text }}>{label}</Text>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={brand.muted}
          secureTextEntry={isSecure && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCapitalize === 'none' ? false : undefined}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: isFocused ? brand.primary : '#E8E4DE',
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: brand.text,
            paddingRight: isSecure ? 46 : 14,
          }}
        />
        {isSecure ? (
          <Pressable
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={brand.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export function AuthButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isBlocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      style={({ pressed }) => [
        {
          backgroundColor: isBlocked ? 'rgba(44, 47, 163, 0.5)' : brand.primary,
          borderRadius: 8,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 10,
          marginTop: 10,
        },
        pressed && !isBlocked && { opacity: 0.9 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
