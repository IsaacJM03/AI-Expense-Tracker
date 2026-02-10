import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in email and password');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start tracking your expenses intelligently</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Display Name (optional)"
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
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
              placeholder="Password (min 8 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: 8 },
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
