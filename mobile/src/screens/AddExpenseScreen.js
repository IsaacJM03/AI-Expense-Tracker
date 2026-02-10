import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';
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
      <Text style={styles.title}>Add Expense</Text>

      <View style={styles.amountContainer}>
        <Text style={styles.currency}>KES</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          autoFocus
          placeholderTextColor={COLORS.border}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Description (e.g., lunch, groceries)"
        value={description}
        onChangeText={setDescription}
        placeholderTextColor={COLORS.textSecondary}
      />

      <TextInput
        style={styles.input}
        placeholder="Merchant (optional)"
        value={merchant}
        onChangeText={setMerchant}
        placeholderTextColor={COLORS.textSecondary}
      />

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Expense'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: 32 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, justifyContent: 'center' },
  currency: { fontSize: FONT_SIZES.xl, color: COLORS.textSecondary, marginRight: 8 },
  amountInput: { fontSize: 48, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', minWidth: 100 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, fontSize: FONT_SIZES.md, marginBottom: 16, color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
});
