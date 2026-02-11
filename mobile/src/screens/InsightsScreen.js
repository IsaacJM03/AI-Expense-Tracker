import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import { CURRENCY_SYMBOLS } from '../utils/currency';
// Replace $ or USD in AI-generated text with the user's currency symbol
function replaceCurrencySymbols(text, currencyCode = 'KES') {
  if (!text) return '';
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  // Replace $3,500.00, $ 3,500, USD 3,500, USD3,500, $700, etc. with correct symbol
  return text
    // Replace $12,000 or $ 12,000 or $12,000.00
    .replace(/\$\s?([\d,.]+)/g, `${symbol} $1`)
    // Replace USD 12,000 or USD12,000 or USD 12,000.00
    .replace(/USD\s?([\d,.]+)/gi, `${symbol} $1`)
    // Replace $ at end (fallback)
    .replace(/\$/g, symbol)
    // Replace USD at end (fallback)
    .replace(/USD/gi, symbol);
}
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function InsightsScreen() {
  const [forecasts, setForecasts] = useState(null);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const cache = useRef({ data: null, timestamp: 0 });
  const { user } = useAuth();

  const loadData = useCallback(async (force = false) => {
    // Use cache if fresh enough
    if (!force && cache.current.data && Date.now() - cache.current.timestamp < CACHE_TTL) {
      const { forecasts: f, insights: i, recommendations: r } = cache.current.data;
      setForecasts(f);
      setInsights(i);
      setRecommendations(r);
      setLoading(false);
      return;
    }

    try {
      // Load forecasts first (most visible), then the rest
      const forecastData = await api.getForecasts();
      setForecasts(forecastData);
      setLoading(false);

      const [insightData, recData] = await Promise.all([
        api.getInsights(),
        api.getRecommendations(),
      ]);
      const ins = insightData.insights || [];
      const recs = recData.recommendations || [];
      setInsights(ins);
      setRecommendations(recs);

      cache.current = { data: { forecasts: forecastData, insights: ins, recommendations: recs }, timestamp: Date.now() };
    } catch (err) {
      console.log('Load error:', err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: FONT_SIZES.sm }}>Loading insights...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textSecondary} />}>
      {/* Forecast Card */}
      {forecasts?.forecast && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="trending-up" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Month Forecast</Text>
          </View>
          <View style={styles.forecastGrid}>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastLabel}>Spent So Far</Text>
              <Text style={styles.forecastValue}>{Math.round(forecasts.forecast.currentSpend).toLocaleString()}</Text>
            </View>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastLabel}>Projected Total</Text>
              <Text style={[styles.forecastValue, { color: COLORS.warning }]}>
                {Math.round(forecasts.forecast.projectedTotal).toLocaleString()}
              </Text>
            </View>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastLabel}>Daily Rate</Text>
              <Text style={styles.forecastValue}>{Math.round(forecasts.forecast.dailyRate).toLocaleString()}/day</Text>
            </View>
            <View style={styles.forecastItem}>
              <Text style={styles.forecastLabel}>Days Left</Text>
              <Text style={styles.forecastValue}>{forecasts.forecast.daysRemaining}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Safe to Spend */}
      {forecasts?.safeToSpend && (
        <View style={styles.safeCard}>
          <View style={styles.safeTitleRow}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.safeTitle}>Safe to Spend</Text>
          </View>
          <Text style={styles.safeAmount}>{formatCurrency(Math.round(forecasts.safeToSpend.safePerDay), user?.currency)}</Text>
          <Text style={styles.safeLabel}>per day for the rest of the month</Text>
        </View>
      )}

      {/* Budget Risks */}
      {forecasts?.budgetRisks?.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Budget Risks</Text>
          </View>
          {forecasts.budgetRisks.map((risk, i) => (
            <View key={i} style={styles.riskItem}>
              <View style={styles.riskHeader}>
                <Text style={styles.riskName}>{risk.categoryName}</Text>
                <View style={[styles.riskBadge, {
                  backgroundColor: risk.riskLevel === 'high' ? COLORS.danger : risk.riskLevel === 'medium' ? COLORS.warning : COLORS.success
                }]}>
                  <Text style={styles.riskBadgeText}>{risk.riskLevel.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(risk.percentUsed, 100)}%`,
                  backgroundColor: risk.riskLevel === 'high' ? COLORS.danger : COLORS.primary
                }]} />
              </View>
              <Text style={styles.riskText}>{risk.percentUsed}% used • {risk.willOverrun ? 'Will overrun' : 'On track'}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Insights</Text>
          </View>
          {insights.map((insight, i) => (
              <View key={i} style={styles.insightItem}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDesc}>{replaceCurrencySymbols(insight.description, user?.currency)}</Text>
              </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="navigate-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Recommendations</Text>
          </View>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recItem}>
              <Text style={styles.recTitle}>{replaceCurrencySymbols(rec.title, user?.currency)}</Text>
              <Text style={styles.recDesc}>{replaceCurrencySymbols(rec.description, user?.currency)}</Text>
              {!!rec.potentialSavings && (
                <Text style={styles.recSavings}>Potential savings: {formatCurrency(Math.round(rec.potentialSavings), user?.currency)}/month</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: {
    ...GLASS_STYLE,
    margin: 16, marginBottom: 0, padding: 20,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  forecastGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  forecastItem: { width: '46%' },
  forecastLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  forecastValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  safeCard: {
    margin: 16, marginBottom: 0, borderRadius: 20, padding: 24, alignItems: 'center',
    backgroundColor: COLORS.secondary,
  },
  safeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  safeTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#fff' },
  safeAmount: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  safeLabel: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  riskItem: { marginBottom: 16 },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskName: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  riskBadgeText: { color: '#fff', fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 0.5 },
  progressBar: { height: 6, backgroundColor: COLORS.glass, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  riskText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },
  insightItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder },
  insightTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  insightDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  recItem: {
    marginBottom: 12, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.glass,
  },
  recTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  recDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  recSavings: { fontSize: FONT_SIZES.sm, color: COLORS.secondary, fontWeight: '700', marginTop: 8 },
});
