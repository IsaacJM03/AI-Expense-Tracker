import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CurrencyScreen() {
  const [currencies, setCurrencies] = useState([]);
  const { user } = useAuth();
  const currentCurrency = user?.currency || 'KES';

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const data = await api.getCurrencies();
      setCurrencies(data.currencies || []);
    } catch (err) {
      console.log('Load error:', err.message);
    }
  };

  const handleSelect = (code) => {
    Alert.alert(
      'Change Currency',
      `Switch your default currency to ${code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              await api.updateProfile({ currency: code });
              Alert.alert('Success', `Currency changed to ${code}`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Current: {currentCurrency}</Text>

      <View style={styles.card}>
        {currencies.map((c) => (
          <TouchableOpacity
            key={c.code}
            style={[styles.currencyRow, c.code === currentCurrency && styles.currencyActive]}
            onPress={() => handleSelect(c.code)}
          >
            <View style={styles.currencyLeft}>
              <Text style={styles.currencySymbol}>{c.symbol}</Text>
              <Text style={styles.currencyCode}>{c.code}</Text>
            </View>
            <Text style={styles.currencyRate}>
              1 USD = {c.rate.toLocaleString()} {c.code}
            </Text>
            {c.code === currentCurrency && (
              <Text style={styles.currentBadge}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 20 },
  card: { ...GLASS_STYLE, overflow: 'hidden' },
  currencyRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  currencyActive: { backgroundColor: COLORS.glassHighlight },
  currencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 80 },
  currencySymbol: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  currencyCode: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  currencyRate: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  currentBadge: { fontSize: FONT_SIZES.lg, color: COLORS.primary, fontWeight: '700' },
});
