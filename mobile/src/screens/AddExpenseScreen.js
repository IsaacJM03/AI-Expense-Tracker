/**
 * AddExpenseScreen with Quick Entry (search bar style) as default,
 * and a toggle to switch to the full form.
 *
 * Voice input uses the device's built-in speech recognition
 * (@react-native-voice/voice → iOS Speech / Android SpeechRecognizer).
 * Audio never leaves the device.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';


// ─── on-device expense parser ──────────────────────────────────────────────
// Handles both quick typed format ("1200 lunch Java House") and natural voice
// patterns ("spent 1500 on groceries at Carrefour", "paid 800 for coffee").
function parseQuickEntry(input) {
  if (!input || !input.trim()) return { amount: '', description: '', merchant: '' };
  const s = input.trim();

  // Extract the first number (supports 1,200 and 1200.50)
  const amountMatch = s.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\b/);
  if (!amountMatch) return { amount: '', description: s, merchant: '' };
  const amount = amountMatch[1].replace(',', '');

  // Remove the matched amount from the string
  let remaining = (s.slice(0, amountMatch.index) + s.slice(amountMatch.index + amountMatch[0].length)).trim();

  // Strip common voice lead-ins ("I spent", "paid", "bought", etc.)
  remaining = remaining.replace(/^(i\s+)?(spent|paid|bought|got)\s+/i, '').trim();
  remaining = remaining.replace(/^(for|on|from)\s+/i, '').trim();

  // Capture "at <Merchant>" or "from <Merchant>" at the end
  let merchant = '';
  const atMatch = remaining.match(/\s+(at|from)\s+(.+)$/i);
  if (atMatch) {
    merchant = atMatch[2].trim();
    remaining = remaining.slice(0, atMatch.index).trim();
  }

  // Strip any leftover prepositions before the description
  remaining = remaining.replace(/^(for|on|at|from)\s+/i, '').trim();

  // If no "at X" merchant was found and there are ≥2 words, treat the last word
  // as the merchant (preserves the original typed format: "1200 lunch JavaHouse")
  if (!merchant) {
    const parts = remaining.split(/\s+/);
    if (parts.length >= 2) {
      merchant = parts[parts.length - 1];
      remaining = parts.slice(0, -1).join(' ');
    }
  }

  return { amount, description: remaining, merchant };
}
// ───────────────────────────────────────────────────────────────────────────


export default function AddExpenseScreen({ navigation }) {
  const [quickInput, setQuickInput] = useState('');
  const [useForm, setUseForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [loading, setLoading] = useState(false);

  const { isListening, partialText, error: voiceError, startListening, stopListening } = useVoiceInput();

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

  // What to show in the quick input while listening
  const liveText = isListening && partialText ? partialText : quickInput;

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
          <View style={[styles.quickBar, isListening && styles.quickBarActive]}>
            <TextInput
              style={styles.quickInput}
              placeholder="e.g. 1200 lunch Java House"
              value={liveText}
              onChangeText={(t) => { if (!isListening) setQuickInput(t); }}
              autoFocus={!isListening}
              placeholderTextColor={COLORS.textTertiary}
              onSubmitEditing={handleQuickSubmit}
              returnKeyType="done"
              editable={!isListening}
            />
            <TouchableOpacity
              style={styles.micBtn}
              onPress={isListening ? stopListening : () => startListening((text) => setQuickInput(text))}
              disabled={loading}
            >
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={26}
                color={isListening ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={handleQuickSubmit} disabled={loading || isListening}>
              <Ionicons name="arrow-up-circle" size={28} color={loading || isListening ? COLORS.textLight : COLORS.primary} />
            </TouchableOpacity>
          </View>

          {isListening && (
            <Text style={styles.listeningHint}>Listening… tap mic to stop</Text>
          )}
          {voiceError ? (
            <Text style={styles.errorText}>{voiceError}</Text>
          ) : null}

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewText}><Text style={styles.previewKey}>Amount:</Text> {parsed.amount || '—'}</Text>
            <Text style={styles.previewText}><Text style={styles.previewKey}>Description:</Text> {parsed.description || '—'}</Text>
            <Text style={styles.previewText}><Text style={styles.previewKey}>Merchant:</Text> {parsed.merchant || '—'}</Text>
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
  quickBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, ...GLASS_STYLE, paddingHorizontal: 12, marginBottom: 8 },
  quickBarActive: { borderColor: COLORS.primary, borderWidth: 1.5 },
  quickInput: { flex: 1, fontSize: 18, color: COLORS.text, paddingVertical: 16 },
  micBtn: { marginLeft: 4, marginRight: 4 },
  quickBtn: { marginLeft: 4 },
  listeningHint: { fontSize: FONT_SIZES.sm, color: COLORS.primary, marginBottom: 10, marginLeft: 4 },
  errorText: { color: 'red', marginBottom: 6, marginLeft: 8, fontSize: FONT_SIZES.sm },
  previewCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 24, marginTop: 10, ...GLASS_STYLE },
  previewLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 6 },
  previewText: { fontSize: FONT_SIZES.md, color: COLORS.text, marginBottom: 2 },
  previewKey: { color: COLORS.primary, fontWeight: 'bold' },
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
