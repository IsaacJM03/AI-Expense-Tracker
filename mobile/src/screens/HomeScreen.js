import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Alert } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';
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
    <TouchableOpacity style={styles.expenseItem} onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}>
      <View style={styles.expenseLeft}>
        <Text style={styles.expenseIcon}>{item.category_icon || '📦'}</Text>
        <View>
          <Text style={styles.expenseDesc}>{item.description || item.category_name || 'Expense'}</Text>
          <Text style={styles.expenseDate}>{new Date(item.expense_date).toLocaleDateString()}</Text>
        </View>
      </View>
      <Text style={styles.expenseAmount}>-{parseFloat(item.amount).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This Month</Text>
        <Text style={styles.summaryAmount}>{totalSpent.toLocaleString()}</Text>
        <Text style={styles.summarySubtext}>spent across {expenses.length} transactions</Text>
      </View>

      {/* Quick Entry */}
      <View style={styles.quickEntry}>
        <TextInput
          style={styles.quickInput}
          placeholder='Quick add: "2000 lunch" or "🍔 500"'
          value={quickText}
          onChangeText={setQuickText}
          onSubmitEditing={handleQuickEntry}
          returnKeyType="send"
          placeholderTextColor={COLORS.textSecondary}
        />
        <TouchableOpacity style={styles.quickButton} onPress={handleQuickEntry}>
          <Text style={styles.quickButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpense}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Use the quick entry above to add your first expense</Text>
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
    backgroundColor: COLORS.primary, margin: 16, borderRadius: 16, padding: 24, alignItems: 'center',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZES.sm },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 4 },
  summarySubtext: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.xs },
  quickEntry: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 8 },
  quickInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    fontSize: FONT_SIZES.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  quickButton: {
    backgroundColor: COLORS.secondary, width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  quickButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  expenseItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 12,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseIcon: { fontSize: 24 },
  expenseDesc: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  expenseDate: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  expenseAmount: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.danger },
  empty: { alignItems: 'center', padding: 48 },
  emptyContainer: { flexGrow: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
