import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>💰</Text>
          <Text style={styles.title}>AI Expense</Text>
          <Text style={styles.titleAccent}>Tracker</Text>
          <Text style={styles.subtitle}>Smart financial planning, powered by AI</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  heroSection: { alignItems: 'center', marginBottom: 48 },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  titleAccent: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.primary, letterSpacing: -1, marginTop: -4 },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: 12 },
  form: { gap: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GLASS_STYLE,
    paddingHorizontal: 16,
  },
  inputIcon: { fontSize: 16, marginRight: 12 },
  input: {
    flex: 1, paddingVertical: 16, fontSize: FONT_SIZES.md, color: COLORS.text,
  },
  button: {
    borderRadius: 20, padding: 17, alignItems: 'center', marginTop: 8,
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600', letterSpacing: 0.3 },
  link: { textAlign: 'center', marginTop: 32, color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
