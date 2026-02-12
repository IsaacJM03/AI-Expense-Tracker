/**
 * AddExpenseScreen with Quick Entry (search bar style) as default,
 * and a toggle to switch to the full form.
 */
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Audio from '../services/audio';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';


export default function AddExpenseScreen({ navigation }) {
  function parseQuickEntry(input) {
    // Example: "1200 lunch Java House" or "5000 rent"
    const match = input.match(/^\d+(?:[.,]\d{1,2})?\s+(.+?)(?:\s+(.+))?$/);
    if (!match) return { amount: '', description: '', merchant: '' };
    const amount = match[1].replace(',', '.');
    const rest = match[2] + (match[3] ? ' ' + match[3] : '');
    // Try to split description and merchant by last space
    const lastSpace = rest.lastIndexOf(' ');
    if (lastSpace === -1) return { amount, description: rest, merchant: '' };
    return {
      amount,
      description: rest.substring(0, lastSpace),
      merchant: rest.substring(lastSpace + 1),
    };
  }

  const [quickInput, setQuickInput] = useState('');
  const [useForm, setUseForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const voiceTimeout = useRef(null);

  const recordingRef = useRef(null);

  const startRecording = async () => {
    setVoiceError(null);
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setVoiceError('Microphone permission denied');
        Alert.alert('Permission needed', 'Please allow microphone access to use voice input.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsListening(true);
      voiceTimeout.current = setTimeout(stopRecording, 8000);
    } catch (e) {
      // Detect missing ExponentAV native module and show actionable message
      if (e && typeof e.message === 'string' && e.message.includes('ExponentAV')) {
        const msg = 'Native audio module missing. Rebuild dev client or use Expo Go with `expo-av` support.';
        setVoiceError(msg);
        Alert.alert('Audio not available', msg);
        console.error('Missing ExponentAV:', e);
        return;
      }
      setVoiceError(e.message || 'Failed to start recording');
      setIsListening(false);
    }
  };

  const stopRecording = async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsListening(false);
      if (voiceTimeout.current) clearTimeout(voiceTimeout.current);

      // Upload to backend STT endpoint
      try {
        const res = await api.uploadAudioForSTT(uri);
        if (res && res.text) {
          setQuickInput((prev) => (prev ? prev + ' ' + res.text : res.text));
        } else {
          setVoiceError('No transcription returned');
        }
      } catch (uErr) {
        setVoiceError(uErr.message || 'STT upload failed');
      }
    } catch (e) {
      if (e && typeof e.message === 'string' && e.message.includes('ExponentAV')) {
        const msg = 'Native audio module missing. Rebuild dev client or use Expo Go with `expo-av` support.';
        setVoiceError(msg);
        Alert.alert('Audio not available', msg);
        console.error('Missing ExponentAV:', e);
        return;
      }
      setVoiceError(e.message || 'Failed to stop recording');
      setIsListening(false);
    }
  };

  const parsed = parseQuickEntry(quickInput);

  const handleQuickSubmit = async () => {
    if (!parsed.amount) {
      Alert.alert('Error', 'Please enter an amount and description');
      return;
    }
    setLoading(true);
    try {
      await api.createExpense({
        amount: parseFloat(parsed.amount),
        description: parsed.description || null,
        merchant: parsed.merchant || null,
        expenseDate: new Date().toISOString(),
      });
      Alert.alert('Success', 'Expense added!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }
    setLoading(true);
    try {
      await api.createExpense({
        amount: parseFloat(amount),
        description: description || null,
        merchant: merchant || null,
        expenseDate: new Date().toISOString(),
      });
      Alert.alert('Success', 'Expense added!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toggleRow}>
        <Ionicons name="search-outline" size={18} color={useForm ? COLORS.textLight : COLORS.primary} />
        <Text style={[styles.toggleLabel, !useForm && { color: COLORS.primary }]}>Quick Entry</Text>
        <Switch
          value={useForm}
          onValueChange={setUseForm}
          thumbColor={useForm ? COLORS.primary : COLORS.surface}
          trackColor={{ false: COLORS.border, true: COLORS.primary + '55' }}
        />
        <Ionicons name="list-outline" size={18} color={useForm ? COLORS.primary : COLORS.textLight} />
        <Text style={[styles.toggleLabel, useForm && { color: COLORS.primary }]}>Full Form</Text>
      </View>
      {!useForm ? (
        <>
          <View style={styles.quickBar}>
            <TextInput
              style={styles.quickInput}
              placeholder="e.g. 1200 lunch Java House"
              value={quickInput}
              onChangeText={setQuickInput}
              autoFocus
              placeholderTextColor={COLORS.textTertiary}
              onSubmitEditing={handleQuickSubmit}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.micBtn} onPress={isListening ? stopRecording : startRecording} disabled={loading}>
              <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={26} color={isListening ? COLORS.primary : COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={handleQuickSubmit} disabled={loading}>
              <Ionicons name="arrow-up-circle" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {voiceError ? (
            <Text style={{ color: 'red', marginBottom: 6, marginLeft: 8 }}>{voiceError}</Text>
          ) : null}
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewText}><Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Amount:</Text> {parsed.amount || '—'}</Text>
            <Text style={styles.previewText}><Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Description:</Text> {parsed.description || '—'}</Text>
            <Text style={styles.previewText}><Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Merchant:</Text> {parsed.merchant || '—'}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.amountSection}>
            <Text style={styles.currency}>KES</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <View style={styles.fields}>
            <View style={styles.inputContainer}>
              <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Description (e.g., lunch, groceries)"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="storefront-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Merchant (optional)"
                value={merchant}
                onChangeText={setMerchant}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleFormSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Expense'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8 },
  toggleLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, marginHorizontal: 2 },
  quickBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, ...GLASS_STYLE, paddingHorizontal: 12, marginBottom: 18 },
  quickInput: { flex: 1, fontSize: 18, color: COLORS.text, paddingVertical: 16 },
  micBtn: { marginLeft: 4, marginRight: 4 },
  quickBtn: { marginLeft: 4 },
  previewCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 24, ...GLASS_STYLE },
  previewLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 6 },
  previewText: { fontSize: FONT_SIZES.md, color: COLORS.text, marginBottom: 2 },
  amountSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' },
  currency: { fontSize: FONT_SIZES.xl, color: COLORS.textSecondary, marginRight: 8, fontWeight: '300' },
  amountInput: { fontSize: FONT_SIZES.hero, fontWeight: '800', color: COLORS.text, textAlign: 'center', minWidth: 100, letterSpacing: -2 },
  fields: { gap: 12, marginBottom: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', ...GLASS_STYLE, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 16, fontSize: FONT_SIZES.md, color: COLORS.text },
  button: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 17, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600', letterSpacing: 0.3 },
});
