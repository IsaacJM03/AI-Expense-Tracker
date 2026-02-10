import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';
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
          <Text style={styles.budgetIcon}>{item.category_icon || '💰'}</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
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
            <Text style={styles.modalTitle}>Create Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textSecondary}
            />
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
    backgroundColor: COLORS.primary, margin: 16, borderRadius: 12, padding: 14, alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  budgetItem: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12,
  },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetIcon: { fontSize: 24 },
  budgetName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  budgetPeriod: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textTransform: 'capitalize' },
  budgetAmount: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.primary },
  adaptiveBadge: { marginTop: 8, alignSelf: 'flex-start' },
  adaptiveText: { fontSize: FONT_SIZES.xs, color: COLORS.secondary },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  input: {
    backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: FONT_SIZES.md, marginBottom: 16, color: COLORS.text,
  },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  periodButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  periodActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  periodTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  saveButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { fontSize: FONT_SIZES.md, color: '#fff', fontWeight: '600' },
});
