import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';
import api from '../services/api';

export default function InsightsScreen() {
  const [forecasts, setForecasts] = useState(null);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [forecastData, insightData, recData] = await Promise.all([
        api.getForecasts(),
        api.getInsights(),
        api.getRecommendations(),
      ]);
      setForecasts(forecastData);
      setInsights(insightData.insights || []);
      setRecommendations(recData.recommendations || []);
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

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Forecast Card */}
      {forecasts?.forecast && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Month Forecast</Text>
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
        <View style={[styles.card, { backgroundColor: COLORS.secondary }]}>
          <Text style={[styles.cardTitle, { color: '#fff' }]}>💚 Safe to Spend</Text>
          <Text style={styles.safeAmount}>{Math.round(forecasts.safeToSpend.safePerDay).toLocaleString()}</Text>
          <Text style={styles.safeLabel}>per day for the rest of the month</Text>
        </View>
      )}

      {/* Budget Risks */}
      {forecasts?.budgetRisks?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Budget Risks</Text>
          {forecasts.budgetRisks.map((risk, i) => (
            <View key={i} style={styles.riskItem}>
              <View style={styles.riskHeader}>
                <Text style={styles.riskName}>{risk.categoryName}</Text>
                <Text style={[styles.riskBadge, { backgroundColor: risk.riskLevel === 'high' ? COLORS.danger : risk.riskLevel === 'medium' ? COLORS.warning : COLORS.success }]}>
                  {risk.riskLevel.toUpperCase()}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(risk.percentUsed, 100)}%`, backgroundColor: risk.riskLevel === 'high' ? COLORS.danger : COLORS.primary }]} />
              </View>
              <Text style={styles.riskText}>{risk.percentUsed}% used • {risk.willOverrun ? 'Will overrun' : 'On track'}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Insights</Text>
          {insights.map((insight, i) => (
            <View key={i} style={styles.insightItem}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDesc}>{insight.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Recommendations</Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recItem}>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recDesc}>{rec.description}</Text>
              {rec.potentialSavings && (
                <Text style={styles.recSavings}>Potential savings: {Math.round(rec.potentialSavings).toLocaleString()}/month</Text>
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
  card: { backgroundColor: COLORS.surface, margin: 16, marginBottom: 0, borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  forecastGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  forecastItem: { width: '46%' },
  forecastLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  forecastValue: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  safeAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  safeLabel: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  riskItem: { marginBottom: 16 },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskName: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, color: '#fff', fontSize: FONT_SIZES.xs, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  riskText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  insightItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  insightTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  insightDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  recItem: { marginBottom: 16, padding: 12, backgroundColor: COLORS.background, borderRadius: 12 },
  recTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  recDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  recSavings: { fontSize: FONT_SIZES.sm, color: COLORS.secondary, fontWeight: '600', marginTop: 8 },
});
