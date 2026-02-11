import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Expense'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  amountSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' },
  currency: { fontSize: FONT_SIZES.xl, color: COLORS.textSecondary, marginRight: 8, fontWeight: '300' },
  amountInput: { fontSize: FONT_SIZES.hero, fontWeight: '800', color: COLORS.text, textAlign: 'center', minWidth: 100, letterSpacing: -2 },
  fields: { gap: 12, marginBottom: 24 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    ...GLASS_STYLE,
    paddingHorizontal: 14,
  },

  input: { flex: 1, paddingVertical: 16, fontSize: FONT_SIZES.md, color: COLORS.text },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 20, padding: 17, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600', letterSpacing: 0.3 },
});
