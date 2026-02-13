import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS } from '../constants/theme';

export default function AddIncomeScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Salary');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState('monthly');

  const handleSubmit = async () => {
    if (loading) return;
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Validation', 'Please enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        amount: Number(amount),
        sourceName: source,
        description: description || '',
        // Format datetime to SQL-friendly string: "YYYY-MM-DD HH:MM:SS"
        incomeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
        isRecurring: !!isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
      };
      const res = await api.createIncome(payload);
      console.log('Create income response:', res);
      // Success toast
      if (Platform.OS === 'android') {
        try { require('react-native').ToastAndroid.show('Income added', require('react-native').ToastAndroid.SHORT); } catch (e) { Alert.alert('Success', 'Income added'); }
      } else {
        Alert.alert('Success', 'Income added');
      }
      // Navigate back to Home and request refresh
      navigation.navigate('MainTabs', { screen: 'Home', params: { refresh: true } });
    } catch (err) {
      console.error('Failed to create income', err);
      Alert.alert('Error', 'Failed to add income');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Income</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="e.g. 120000"
          value={amount}
          onChangeText={setAmount}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Source</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Salary"
          value={source}
          onChangeText={setSource}
        />
      </View>
      <View style={styles.field}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.label}>Recurring</Text>
          <Switch value={isRecurring} onValueChange={setIsRecurring} />
        </View>
        {isRecurring && (
          <Text style={[styles.label, { marginTop: 8 }]}>Interval: {recurrenceInterval}</Text>
        )}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. February salary"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
        <Ionicons name="checkmark-outline" size={18} color="#fff" />
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
    fontFamily: FONTS.medium,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontFamily: FONTS.semiBold,
    marginLeft: 6,
  },
});
