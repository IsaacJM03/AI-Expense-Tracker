import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator,
  LayoutAnimation, Platform, UIManager, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { formatCurrency } from '../utils/currency';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Financial Quotes ────────────────────────────────────────
const QUOTES = [
  { text: 'Do not save what is left after spending, but spend what is left after saving.', author: 'Warren Buffett', icon: '💡' },
  { text: 'A budget is telling your money where to go instead of wondering where it went.', author: 'Dave Ramsey', icon: '📊' },
  { text: 'The habit of saving is itself an education; it fosters every virtue.', author: 'T.T. Munger', icon: '🌱' },
  { text: 'It\'s not your salary that makes you rich, it\'s your spending habits.', author: 'Charles A. Jaffe', icon: '🎯' },
  { text: 'Beware of little expenses. A small leak will sink a great ship.', author: 'Benjamin Franklin', icon: '🚢' },
  { text: 'Money is a terrible master but an excellent servant.', author: 'P.T. Barnum', icon: '⚡' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin', icon: '📚' },
  { text: 'The more you learn, the more you earn.', author: 'Warren Buffett', icon: '🧠' },
  { text: 'Never spend your money before you have it.', author: 'Thomas Jefferson', icon: '🔑' },
  { text: 'Financial peace isn\'t the acquisition of stuff. It\'s learning to live on less than you make.', author: 'Dave Ramsey', icon: '✨' },
  { text: 'Every time you borrow money, you\'re robbing your future self.', author: 'Nathan W. Morris', icon: '⏳' },
  { text: 'Wealth consists not in having great possessions, but in having few wants.', author: 'Epictetus', icon: '🏛️' },
  { text: 'Rich people stay rich by living like they\'re broke. Broke people stay broke by living like they\'re rich.', author: 'Unknown', icon: '💎' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb', icon: '🌳' },
  { text: 'Don\'t tell me what you value. Show me your budget, and I\'ll tell you what you value.', author: 'Joe Biden', icon: '🗳️' },
  { text: 'Money looks better in the bank than on your feet.', author: 'Sophia Amoruso', icon: '👟' },
  { text: 'Compound interest is the eighth wonder of the world.', author: 'Albert Einstein', icon: '🌍' },
  { text: 'A penny saved is a penny earned.', author: 'Benjamin Franklin', icon: '🪙' },
  { text: 'Too many people spend money they haven\'t earned to buy things they don\'t want to impress people they don\'t like.', author: 'Will Rogers', icon: '🎭' },
  { text: 'You must gain control over your money or the lack of it will forever control you.', author: 'Dave Ramsey', icon: '🎮' },
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [quote, setQuote] = useState(getRandomQuote);
  const lastFetchRef = useRef(0);
  const STALE_MS = 30_000; // 30 seconds

  // Quick Entry Bar State
  const [quickInput, setQuickInput] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [parsedQuick, setParsedQuick] = useState({ amount: '', description: '', merchant: '' });

  // Parse quick input (simple: "1200 lunch Java House")
  React.useEffect(() => {
    // Simple parse: first number is amount, rest is description/merchant
    const match = quickInput.match(/(\d+(?:[.,]\d{1,2})?)(.*)/);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const rest = match[2].trim();
      // Try to split description and merchant by last space
      let description = rest;
      let merchant = '';
      if (rest.includes(' ')) {
        const idx = rest.lastIndexOf(' ');
        description = rest.slice(0, idx);
        merchant = rest.slice(idx + 1);
      }
      setParsedQuick({ amount, description: description.trim(), merchant: merchant.trim() });
    } else {
      setParsedQuick({ amount: '', description: '', merchant: '' });
    }
  }, [quickInput]);

  // Handle quick add
  const handleQuickAdd = async () => {
    if (quickLoading || !parsedQuick.amount || !parsedQuick.description) return;
    setQuickLoading(true);
    try {
      const payload = {
        amount: parseFloat(parsedQuick.amount),
        description: parsedQuick.description,
        merchant: parsedQuick.merchant,
        source: 'quick_entry',
        expense_date: new Date().toISOString(),
      };
      const newExpense = await api.addExpense(payload);
      setExpenses(prev => [newExpense, ...prev]);
      // Fix cursor bug: clear input after a short delay
      setTimeout(() => {
        setQuickInput("");
        setParsedQuick({ amount: '', description: '', merchant: '' });
      }, 10);
    } catch (err) {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setQuickLoading(false);
    }
  };

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    // Skip if data is fresh and not forced
    if (!force && lastFetchRef.current && now - lastFetchRef.current < STALE_MS) {
      return;
    }

    // Only show full loading spinner on very first load (no data yet)
    const isFirstLoad = expenses.length === 0 && !summary;
    if (isFirstLoad) setLoading(true);

    try {
      const [expRes, sumRes] = await Promise.all([
        api.getExpenses({ limit: 50 }),
        api.getExpenseSummary().catch(() => null),
      ]);
      setExpenses(expRes?.expenses || []);
      if (sumRes) setSummary(sumRes);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // stable reference — no deps needed since we use setters

  useFocusEffect(
    useCallback(() => {
      fetchData(false); // non-forced: skips if data is fresh
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setQuote(getRandomQuote());
    fetchData(true); // forced refresh
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.deleteExpense(id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpenses(prev => prev.filter(e => e.id !== id));
            if (expandedId === id) setExpandedId(null);
            if (editingId === id) setEditingId(null);
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }
      },
    ]);
  }, [expandedId, editingId]);

  const handleSaveEdit = useCallback(async (id) => {
    try {
      const payload = {};
      if (editData.description !== undefined) payload.description = editData.description;
      if (editData.amount !== undefined) payload.amount = parseFloat(editData.amount);
      if (editData.merchant !== undefined) payload.merchant = editData.merchant;
      await api.updateExpense(id, payload);
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e));
      setEditingId(null);
      setEditData({});
    } catch { Alert.alert('Error', 'Failed to update'); }
  }, [editData]);

  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => prev === id ? null : id);
    if (editingId && editingId !== id) {
      setEditingId(null);
      setEditData({});
    }
  }, [editingId]);

  const startEdit = useCallback((item) => {
    setEditingId(item.id);
    setEditData({
      description: item.description || '',
      amount: String(item.amount),
      merchant: item.merchant || '',
    });
  }, []);

  const getCategoryIcon = (item) => {
    const name = (item.category_name || '').toLowerCase();
    if (name.includes('food') || name.includes('grocer')) return 'fast-food-outline';
    if (name.includes('transport') || name.includes('taxi') || name.includes('uber')) return 'car-outline';
    if (name.includes('entertainment') || name.includes('movie')) return 'film-outline';
    if (name.includes('coffee')) return 'cafe-outline';
    if (name.includes('health') || name.includes('pharm')) return 'medkit-outline';
    if (name.includes('shopping') || name.includes('cloth')) return 'shirt-outline';
    if (name.includes('housing') || name.includes('rent')) return 'home-outline';
    if (name.includes('utilit') || name.includes('electric')) return 'flash-outline';
    if (name.includes('edu') || name.includes('course')) return 'school-outline';
    if (name.includes('subscri')) return 'card-outline';
    if (name.includes('gym') || name.includes('fitness')) return 'barbell-outline';
    return 'receipt-outline';
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'ocr': return { label: 'OCR', color: COLORS.accent };
      case 'quick_entry': return { label: 'AI', color: '#8B5CF6' };
      case 'ocr-image': return { label: 'Scan', color: '#06B6D4' };
      default: return null;
    }
  };

  const fmtCurrency = (amount) => formatCurrency(amount, user?.currency);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const renderExpense = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;
    const badge = getSourceBadge(item.source);

    return (
      <TouchableOpacity
        style={[styles.expenseCard, isExpanded && styles.expenseCardExpanded]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.expenseRow}>
          <View style={styles.iconCircle}>
            <Ionicons name={getCategoryIcon(item)} size={20} color={COLORS.primary} />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDesc} numberOfLines={1}>
              {item.description || 'Expense'}
            </Text>
            <Text style={styles.expenseMeta}>
              {formatDate(item.expense_date || item.created_at)}
              {item.merchant ? ` · ${item.merchant}` : ''}
            </Text>
          </View>
          <View style={styles.expenseRight}>
            <Text style={[styles.expenseAmount, { color: COLORS.danger }]}>{fmtCurrency(item.amount)}</Text>
            {!!badge && (
              <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.textLight}
            style={{ marginLeft: 4 }}
          />
        </View>

        {isExpanded && !isEditing && (
          <View style={styles.expandedSection}>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{item.category_name || 'Uncategorized'}</Text>
              </View>
              {!!item.merchant && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Merchant</Text>
                  <Text style={styles.detailValue}>{item.merchant}</Text>
                </View>
              )}
              {!!item.payment_method && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={styles.detailValue}>{item.payment_method}</Text>
                </View>
              )}
              {!!item.source && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Source</Text>
                  <Text style={styles.detailValue}>{item.source}</Text>
                </View>
              )}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isExpanded && isEditing && (
          <View style={styles.expandedSection}>
            <TextInput
              style={styles.editInput}
              value={editData.description}
              onChangeText={t => setEditData(prev => ({ ...prev, description: t }))}
              placeholder="Description"
              placeholderTextColor={COLORS.textLight}
            />
            <TextInput
              style={styles.editInput}
              value={editData.amount}
              onChangeText={t => setEditData(prev => ({ ...prev, amount: t }))}
              placeholder="Amount"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.editInput}
              value={editData.merchant}
              onChangeText={t => setEditData(prev => ({ ...prev, merchant: t }))}
              placeholder="Merchant"
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => handleSaveEdit(item.id)}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setEditingId(null); setEditData({}); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Greeting */}
      <View style={styles.greeting}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>
            {new Date().getHours() < 12 ? 'Good Morning ☀️' : new Date().getHours() < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙'}
          </Text>
          <Text style={styles.userName}>{user?.display_name || 'User'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={36} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Daily Quote */}
      <View style={styles.quoteCard}>
        <Text style={styles.quoteIcon}>{quote.icon}</Text>
        <View style={styles.quoteContent}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>
      </View>

      {/* Summary Card */}
      {!!summary && (() => {
        const totalSpent = (summary.summary || []).reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
        const txCount = (summary.summary || []).reduce((sum, s) => sum + parseInt(s.count || 0), 0);
        return (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryAmount}>{fmtCurrency(totalSpent)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="trending-up-outline" size={16} color={COLORS.success} />
                <Text style={styles.summaryItemText}>
                  {txCount} transactions
                </Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {/*
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}> 
            <Ionicons name="add-outline" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.actionLabel}>Add</Text>
        </TouchableOpacity>
        */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ScanReceipt')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '15' }]}> 
            <Ionicons name="camera-outline" size={22} color={COLORS.accent} />
          </View>
          <Text style={styles.actionLabel}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Export')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '15' }]}> 
            <Ionicons name="download-outline" size={22} color={COLORS.success} />
          </View>
          <Text style={styles.actionLabel}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Currency')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '15' }]}> 
            <Ionicons name="swap-horizontal-outline" size={22} color="#8B5CF6" />
          </View>
          <Text style={styles.actionLabel}>Convert</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Entry Bar - moved here for visibility */}
      <View style={styles.quickBarRow}>
        <View style={styles.quickBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.quickInput}
            placeholder="e.g. 1200 lunch Java House"
            value={quickInput}
            onChangeText={setQuickInput}
            placeholderTextColor={COLORS.textTertiary}
            onSubmitEditing={handleQuickAdd}
            returnKeyType="done"
          />
        </View>
        <TouchableOpacity style={styles.quickAddBtn} onPress={handleQuickAdd} disabled={quickLoading}>
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        <Text style={styles.sectionCount}>{expenses.length}</Text>
      </View>
    </View>
  );

  // First load only — show centered spinner
  if (loading && expenses.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first expense</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
  },
  userName: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 2,
  },
  notifBtn: {
    padding: 4,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    ...SHADOWS.small,
  },
  quoteIcon: {
    fontSize: 24,
    marginRight: 10,
    marginTop: 2,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  quoteAuthor: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textLight,
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.medium,
  },
  summaryAmount: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: '#fff',
    marginTop: 4,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryItemText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textLight,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  expenseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.small,
  },
  expenseCardExpanded: {
    ...SHADOWS.medium,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  expenseMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textLight,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  expenseAmount: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.error + '10',
  },
  deleteBtnText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.error,
  },
  editInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#fff',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textLight,
    marginTop: 4,
  },
  quickBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  quickBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, ...SHADOWS.small, paddingHorizontal: 12 },
  quickInput: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 12 },
  quickAddBtn: { marginLeft: 8 },
  quickPreview: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 12, ...SHADOWS.small },
  quickPreviewText: { fontSize: 13, color: COLORS.text, marginBottom: 2 },
});
