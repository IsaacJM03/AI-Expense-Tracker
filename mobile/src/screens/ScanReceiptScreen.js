import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function ScanReceiptScreen({ navigation }) {
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleProcess = async () => {
    if (!ocrText.trim()) {
      Alert.alert('Error', 'Please enter or paste receipt text');
      return;
    }
    setLoading(true);
    try {
      const data = await api.processReceipt(ocrText);
      setResult(data);
      if (!data.needsConfirmation) {
        Alert.alert('Success', `Expense of ${data.parsed.total} added from ${data.parsed.merchant || 'receipt'}`);
      }
    } catch (err) {
      Alert.alert('Processing Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    Alert.alert('Confirmed', 'Expense saved successfully!');
    setResult(null);
    setOcrText('');
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        Paste receipt text below or use camera capture
      </Text>

      {!result ? (
        <>
          <TextInput
            style={styles.textArea}
            placeholder={'Paste receipt text here...\n\nExample:\nJava House\n2024-01-15\nCoffee    350\nSandwich  500\nTotal: 850'}
            value={ocrText}
            onChangeText={setOcrText}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textTertiary}
          />

          <TouchableOpacity style={styles.processButton} onPress={handleProcess} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.processButtonText}>Process Receipt</Text>
            )}
          </TouchableOpacity>

          <View style={styles.cameraCard}>
            <Ionicons name="camera-outline" size={40} color={COLORS.textSecondary} style={{ marginBottom: 8, opacity: 0.6 }} />
            <Text style={styles.cameraTitle}>Camera Capture</Text>
            <Text style={styles.cameraDesc}>
              Camera-based OCR scanning coming in the next update
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.resultCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.resultTitle}>Extracted Data</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Merchant</Text>
            <Text style={styles.resultValue}>{result.parsed.merchant || 'Unknown'}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Total</Text>
            <Text style={styles.resultAmount}>{parseFloat(result.parsed.total).toLocaleString()}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Date</Text>
            <Text style={styles.resultValue}>{result.parsed.date}</Text>
          </View>

          {result.parsed.lineItems?.length > 0 && (
            <View style={styles.lineItems}>
              <Text style={styles.resultLabel}>Items</Text>
              {result.parsed.lineItems.map((item, i) => (
                <View key={i} style={styles.lineItem}>
                  <Text style={styles.lineItemName}>{item.name}</Text>
                  <Text style={styles.lineItemAmount}>{parseFloat(item.amount).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.confidenceRow}>
            <Text style={styles.resultLabel}>Confidence</Text>
            <View style={[styles.confidenceBadge, {
              backgroundColor: result.parsed.confidence >= 0.8 ? COLORS.success
                : result.parsed.confidence >= 0.6 ? COLORS.warning : COLORS.danger
            }]}>
              <Text style={styles.confidenceText}>{Math.round(result.parsed.confidence * 100)}%</Text>
            </View>
          </View>

          {result.needsConfirmation && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
              <Text style={styles.confirmNote}>Low confidence — please verify the details above</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editButton} onPress={() => setResult(null)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm & Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 20 },
  textArea: {
    ...GLASS_STYLE,
    padding: 16, fontSize: FONT_SIZES.md, minHeight: 200,
    color: COLORS.text, marginBottom: 16,
  },
  processButton: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24,
  },
  processButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  cameraCard: {
    ...GLASS_STYLE,
    padding: 24, alignItems: 'center',
    borderStyle: 'dashed',
  },

  cameraTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  cameraDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary, textAlign: 'center' },
  resultCard: {
    ...GLASS_STYLE,
    padding: 20,
  },
  resultTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  resultLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  resultValue: { fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: '500' },
  resultAmount: { fontSize: FONT_SIZES.xl, color: COLORS.primary, fontWeight: '700' },
  lineItems: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineItemName: { fontSize: FONT_SIZES.sm, color: COLORS.text },
  lineItemAmount: { fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: '500' },
  confidenceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12,
  },
  confidenceBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  confidenceText: { color: '#fff', fontSize: FONT_SIZES.sm, fontWeight: '700' },
  confirmNote: { fontSize: FONT_SIZES.sm, color: COLORS.warning, marginTop: 8, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editButton: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
    ...GLASS_STYLE,
  },
  editButtonText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  confirmButton: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: COLORS.secondary, alignItems: 'center' },
  confirmButtonText: { fontSize: FONT_SIZES.md, color: '#fff', fontWeight: '600' },
});
