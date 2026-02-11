import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function SeasonalScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const analysis = await api.getSeasonalAnalysis();
      setData(analysis);
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

  const renderDayOfWeekBar = (item) => {
    const absVs = Math.abs(item.vsAverage);
    const width = Math.min(absVs, 100);
    const isHigh = item.vsAverage > 0;

    return (
      <View key={item.dayOfWeek} style={styles.barRow}>
        <Text style={styles.barLabel}>{item.dayName.substring(0, 3)}</Text>
        <View style={styles.barContainer}>
          <View style={[styles.bar, {
            width: `${Math.max(width, 5)}%`,
            backgroundColor: isHigh ? COLORS.danger : COLORS.success,
          }]} />
        </View>
        <Text style={[styles.barValue, { color: isHigh ? COLORS.danger : COLORS.success }]}>
          {item.vsAverage > 0 ? '+' : ''}{item.vsAverage}%
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textSecondary} />}>
      <Text style={styles.subtitle}>Discover your spending patterns over time</Text>

      {/* Legend & Analysis */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>How to read this page</Text>
        <Text style={styles.legendText}>
          <Text style={{ color: COLORS.danger, fontWeight: 'bold' }}>Red bars</Text> mean higher-than-average spending; <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>green bars</Text> mean lower-than-average. 
          Each section analyzes your real expenses to reveal patterns by day, month, and pay cycle. 
          Use these insights to spot habits, plan budgets, and avoid spikes.
        </Text>
      </View>

      {/* Day of Week Pattern */}
      {data?.dayOfWeekPattern && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bar-chart-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Day of Week Pattern</Text>
          </View>
          <Text style={styles.cardDesc}>How your spending varies by day (vs. your average)</Text>
          {data.dayOfWeekPattern.map(renderDayOfWeekBar)}
        </View>
      )}

      {/* Monthly Seasonality */}
      {data?.monthlySeasonality && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Monthly Patterns</Text>
          </View>
          <Text style={styles.cardDesc}>Average daily spending by month</Text>
          {data.monthlySeasonality.map((item) => (
            <View key={item.month} style={styles.monthRow}>
              <Text style={styles.monthName}>{item.monthName.substring(0, 3)}</Text>
              <Text style={styles.monthAmount}>{Math.round(item.avgDailySpend).toLocaleString()}/day</Text>
              <Text style={[styles.monthVs, {
                color: item.vsAverage > 0 ? COLORS.danger : COLORS.success,
              }]}>
                {item.vsAverage > 0 ? '+' : ''}{item.vsAverage}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Pay Cycle */}
      {data?.payCycleCorrelation && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cash-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Pay Cycle Impact</Text>
          </View>
          <Text style={styles.cardInsight}>{data.payCycleCorrelation.insight}</Text>
          {data.payCycleCorrelation.hasSpike && (
            <View style={styles.payCycleDetails}>
              <View style={styles.payCycleStat}>
                <Text style={styles.statLabel}>After Payday</Text>
                <Text style={[styles.statValue, { color: COLORS.danger }]}>
                  {Math.round(data.payCycleCorrelation.postPaydayAvg).toLocaleString()}
                </Text>
              </View>
              <View style={styles.payCycleStat}>
                <Text style={styles.statLabel}>Other Days</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {Math.round(data.payCycleCorrelation.otherDaysAvg).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Category Seasonality */}
      {data?.categorySeasonality && data.categorySeasonality.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag-outline" size={20} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Category Seasonal Peaks</Text>
          </View>
          {data.categorySeasonality.map((item, i) => (
            <View key={i} style={styles.catRow}>
              <Text style={styles.catName}>{item.category}</Text>
              <Text style={styles.catPeak}>
                Peak: {item.peakMonth} (+{item.peakVsAvg}% vs avg)
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Empty state */}
      {!data?.dayOfWeekPattern && !data?.monthlySeasonality && (
        <View style={styles.empty}>
          <Ionicons name="analytics-outline" size={48} color={COLORS.textTertiary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>Not enough data yet</Text>
          <Text style={styles.emptySubtext}>Keep tracking expenses to unlock seasonal insights</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginHorizontal: 16, marginTop: 8, marginBottom: 16 },
  card: {
    ...GLASS_STYLE,
    margin: 16, marginTop: 0, padding: 20, marginBottom: 16,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  cardDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 16 },
  cardInsight: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 22, marginTop: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { width: 36, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '500' },
  barContainer: { flex: 1, height: 14, backgroundColor: COLORS.glass, borderRadius: 7, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 7 },
  barValue: { width: 45, fontSize: FONT_SIZES.xs, fontWeight: '700', textAlign: 'right' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  monthName: { width: 40, fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: '500' },
  monthAmount: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.text },
  monthVs: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  payCycleDetails: { flexDirection: 'row', marginTop: 16, gap: 12 },
  payCycleStat: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center',
    backgroundColor: COLORS.glass,
  },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  statValue: { fontSize: FONT_SIZES.lg, fontWeight: '700' },
  catRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder },
  catName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  catPeak: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', padding: 60 },

  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  legendCard: {
    ...GLASS_STYLE,
    margin: 16, padding: 20,
  },
  legendTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  legendText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, lineHeight: 22 },
});
