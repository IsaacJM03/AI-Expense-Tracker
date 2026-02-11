import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [quickText, setQuickText] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [expenseData, summaryData] = await Promise.all([
        api.getExpenses({ limit: 20 }),
        api.getExpenseSummary(),
      ]);
      setExpenses(expenseData.expenses || []);
      setSummary(summaryData);
    } catch (err) {
      console.log('Load error:', err.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickEntry = async () => {
    if (!quickText.trim()) return;
    try {
      await api.quickEntry(quickText);
      setQuickText('');
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const totalSpent = summary?.summary?.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) || 0;

  const renderExpense = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseLeft}>
        <View style={styles.expenseIconContainer}>
          {item.category_icon ? (
            <Text style={styles.expenseIcon}>{item.category_icon}</Text>
          ) : (
            <Ionicons name="cube-outline" size={20} color={COLORS.textSecondary} />
          )}
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDesc} numberOfLines={1}>{item.description || item.category_name || 'Expense'}</Text>
          <Text style={styles.expenseDate}>{new Date(item.expense_date).toLocaleDateString()}</Text>
        </View>
      </View>
      <Text style={styles.expenseAmount}>-{parseFloat(item.amount).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Hero Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This Month</Text>
        <Text style={styles.summaryAmount}>{totalSpent.toLocaleString()}</Text>
        <View style={styles.summaryMeta}>
          <View style={styles.summaryDot} />
          <Text style={styles.summarySubtext}>{expenses.length} transactions</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('ScanReceipt')}>
          <Ionicons name="scan-outline" size={20} color="#fff" />
          <Text style={styles.scanButtonText}>Scan Receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Entry */}
      <View style={styles.quickEntry}>
        <View style={styles.quickInputContainer}>
          <Ionicons name="flash-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.quickInput}
            placeholder='Quick: "2000 lunch" or "🍔 500"'
            value={quickText}
            onChangeText={setQuickText}
            onSubmitEditing={handleQuickEntry}
            returnKeyType="send"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>
        <TouchableOpacity style={styles.quickButton} onPress={handleQuickEntry}>
          <Text style={styles.quickButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpense}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textSecondary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textTertiary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Use the quick entry above{'\n'}to add your first expense</Text>
          </View>
        }
        contentContainerStyle={expenses.length === 0 && styles.emptyContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryCard: {
    margin: 16, borderRadius: 24, padding: 28, alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.sm, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
  summaryAmount: { color: '#fff', fontSize: FONT_SIZES.hero, fontWeight: '800', marginVertical: 4, letterSpacing: -2 },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  summarySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZES.xs },
  quickEntry: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 10 },
  quickInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    ...GLASS_STYLE,
    paddingHorizontal: 14,
  },
  quickActions: { paddingHorizontal: 16, marginBottom: 12 },
  scanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
  },
  scanButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  quickInput: {
    flex: 1, paddingVertical: 13,
    fontSize: FONT_SIZES.md, color: COLORS.text,
  },
  quickButton: {
    backgroundColor: COLORS.secondary, width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  quickButtonText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  expenseItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    ...GLASS_STYLE,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  expenseIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.glassHighlight,
    alignItems: 'center', justifyContent: 'center',
  },
  expenseIcon: { fontSize: 18 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  expenseDate: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  expenseAmount: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.danger },
  empty: { alignItems: 'center', padding: 60 },
  emptyContainer: { flexGrow: 1 },

  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
