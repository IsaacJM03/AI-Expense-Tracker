import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function BudgetScreen() {
  const [budgets, setBudgets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');

  const loadData = async () => {
    try {
      const data = await api.getBudgets();
      setBudgets(data.budgets || []);
    } catch (err) {
      console.log('Load error:', err.message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!amount) return;
    try {
      await api.createBudget({
        amount: parseFloat(amount),
        period,
        startDate: new Date().toISOString().split('T')[0],
      });
      setShowModal(false);
      setAmount('');
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const renderBudget = ({ item }) => {
    const budgetAmount = parseFloat(item.amount);
    return (
      <View style={styles.budgetItem}>
        <View style={styles.budgetHeader}>
          <View style={styles.budgetIconContainer}>
            <Text style={styles.budgetIcon}>{item.category_icon || '💰'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.budgetName}>{item.category_name || 'Overall Budget'}</Text>
            <Text style={styles.budgetPeriod}>{item.period}</Text>
          </View>
          <Text style={styles.budgetAmount}>{budgetAmount.toLocaleString()}</Text>
        </View>
        {item.is_adaptive && (
          <View style={styles.adaptiveBadge}>
            <Text style={styles.adaptiveText}>🤖 Adaptive</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
        <Text style={styles.addButtonText}>+ New Budget</Text>
      </TouchableOpacity>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        renderItem={renderBudget}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textSecondary} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No budgets set</Text>
            <Text style={styles.emptySubtext}>Create a budget to start tracking your spending limits</Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create Budget</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>💰</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={styles.periodRow}>
              {['weekly', 'monthly', 'quarterly'].map(p => (
                <TouchableOpacity key={p} style={[styles.periodButton, period === p && styles.periodActive]} onPress={() => setPeriod(p)}>
                  <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCreate}>
                <Text style={styles.saveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addButton: {
    backgroundColor: COLORS.primary, margin: 16, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  budgetItem: {
    ...GLASS_STYLE,
    padding: 16, marginBottom: 10,
  },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.glassHighlight,
    alignItems: 'center', justifyContent: 'center',
  },
  budgetIcon: { fontSize: 18 },
  budgetName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  budgetPeriod: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textTransform: 'capitalize' },
  budgetAmount: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.primary },
  adaptiveBadge: { marginTop: 10, alignSelf: 'flex-start' },
  adaptiveText: { fontSize: FONT_SIZES.xs, color: COLORS.secondary },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textTertiary, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    ...GLASS_STYLE,
    paddingHorizontal: 14, marginBottom: 16,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: FONT_SIZES.md, color: COLORS.text },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  periodButton: {
    flex: 1, padding: 12, borderRadius: 14, alignItems: 'center',
    ...GLASS_STYLE,
  },
  periodActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  periodTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: {
    flex: 1, padding: 16, borderRadius: 16, alignItems: 'center',
    ...GLASS_STYLE,
  },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  saveButton: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { fontSize: FONT_SIZES.md, color: '#fff', fontWeight: '600' },
});
