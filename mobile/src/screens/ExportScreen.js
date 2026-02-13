import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function ExportScreen() {
  const [loading, setLoading] = useState(false);

  const handleExportExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.exportExpenses();
      await Share.share({ message: data, title: 'Expenses Export' });
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportIncomes = async () => {
    setLoading(true);
    try {
      const data = await api.exportIncomes();
      await Share.share({ message: data, title: 'Incomes Export' });
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    setLoading(true);
    try {
      const report = await api.exportAll();
      const combined = `=== EXPENSES ===\n${report.expenses}\n\n=== INCOMES ===\n${report.incomes}\n\nGenerated: ${report.generatedAt}`;
      await Share.share({ message: combined, title: 'Full Financial Report' });
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Your data belongs to you. Export anytime in CSV format.</Text>

      <View style={styles.card}>
        <Ionicons name="bar-chart-outline" size={40} color={COLORS.primary} style={{ marginBottom: 12, opacity: 0.8 }} />
        <Text style={styles.cardTitle}>Export Expenses</Text>
        <Text style={styles.cardDesc}>All your expenses with categories, dates, and amounts</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportExpenses} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportButtonText}>Export CSV</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Ionicons name="cash-outline" size={40} color={COLORS.secondary} style={{ marginBottom: 12, opacity: 0.8 }} />
        <Text style={styles.cardTitle}>Export Incomes</Text>
        <Text style={styles.cardDesc}>All income records with sources and recurrence info</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportIncomes} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportButtonText}>Export CSV</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Ionicons name="document-text-outline" size={40} color={COLORS.accent} style={{ marginBottom: 12, opacity: 0.8 }} />
        <Text style={styles.cardTitle}>Full Financial Report</Text>
        <Text style={styles.cardDesc}>Complete export of all expenses and incomes</Text>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: COLORS.secondary }]} onPress={handleExportAll} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportButtonText}>Export All</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 24 },
  card: {
    ...GLASS_STYLE,
    padding: 24, marginBottom: 16, alignItems: 'center',
  },

  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
  exportButton: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, alignItems: 'center',
  },
  exportButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
});
