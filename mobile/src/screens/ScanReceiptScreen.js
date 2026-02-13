import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ScanReceiptScreen({ navigation }) {
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [mode, setMode] = useState(null); // null | 'text' | 'image'
  const { user } = useAuth();

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to scan receipts.');
      return false;
    }
    return true;
  };

  const handleCameraCapture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0].uri);
      setMode('image');
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select receipt images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0].uri);
      setMode('image');
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const data = await api.uploadReceiptImage(selectedImage);

      if (data.needsManualEntry) {
        Alert.alert(
          'Image Saved',
          'Automatic text extraction is not available. Please paste the receipt text manually.',
          [{ text: 'OK', onPress: () => { setMode('text'); setSelectedImage(null); } }]
        );
      } else {
        setResult(data);
        if (!data.needsConfirmation) {
          Alert.alert('Success', `Expense of ${data.parsed.total} added from ${data.parsed.merchant || 'receipt'}`);
        }
      }
    } catch (err) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessText = async () => {
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
    handleReset();
    navigation.goBack();
  };

  const handleReset = () => {
    setResult(null);
    setOcrText('');
    setSelectedImage(null);
    setMode(null);
  };

  // ─── Mode Selection ───
  if (!mode && !result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Choose how to add your receipt</Text>

        <TouchableOpacity style={styles.optionCard} onPress={handleCameraCapture}>
          <View style={styles.optionIconContainer}>
            <Ionicons name="camera" size={28} color="#fff" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Take Photo</Text>
            <Text style={styles.optionDesc}>Use your camera to capture a receipt</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={handlePickImage}>
          <View style={[styles.optionIconContainer, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="images" size={28} color="#fff" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Upload from Photos</Text>
            <Text style={styles.optionDesc}>Select a receipt image from your library</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('text')}>
          <View style={[styles.optionIconContainer, { backgroundColor: COLORS.accent }]}>
            <Ionicons name="document-text" size={28} color="#fff" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Paste Text</Text>
            <Text style={styles.optionDesc}>Manually enter or paste receipt text</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Image Preview ───
  if (mode === 'image' && selectedImage && !result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} resizeMode="contain" />
        </View>

        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleCameraCapture}>
            <Ionicons name="camera-outline" size={18} color={COLORS.text} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retakeButton} onPress={handlePickImage}>
            <Ionicons name="images-outline" size={18} color={COLORS.text} />
            <Text style={styles.retakeText}>Choose Another</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadImage} disabled={loading}>
          {loading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadButtonText}>Processing...</Text>
            </View>
          ) : (
            <View style={styles.uploadingRow}>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload & Process</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={handleReset}>
          <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
          <Text style={styles.backLinkText}>Back to options</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Text Input ───
  if (mode === 'text' && !result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

        <TouchableOpacity style={styles.processButton} onPress={handleProcessText} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.uploadingRow}>
              <Ionicons name="scan-outline" size={18} color="#fff" />
              <Text style={styles.processButtonText}>Process Receipt</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={handleReset}>
          <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
          <Text style={styles.backLinkText}>Back to options</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Result View ───
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.resultCard}>
        <View style={styles.resultTitleRow}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
          <Text style={styles.resultTitle}>Extracted Data</Text>
          {result.parseSource && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>{result.parseSource}</Text>
            </View>
          )}
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Merchant</Text>
          <Text style={styles.resultValue}>{result.parsed?.merchant || 'Unknown'}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Total</Text>
          <Text style={styles.resultAmount}>{formatCurrency(result.parsed?.total, user?.currency)}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Date</Text>
          <Text style={styles.resultValue}>{result.parsed?.date || 'Not detected'}</Text>
        </View>

        {result.parsed?.lineItems?.length > 0 && (
          <View style={styles.lineItems}>
            <Text style={styles.resultLabel}>Items</Text>
            {result.parsed.lineItems.map((item, i) => (
              <View key={i} style={styles.lineItem}>
                <Text style={styles.lineItemName}>{item.name}</Text>
                <Text style={styles.lineItemAmount}>{formatCurrency(item.amount, user?.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.confidenceRow}>
          <Text style={styles.resultLabel}>Confidence</Text>
          <View style={[styles.confidenceBadge, {
            backgroundColor: (result.parsed?.confidence || 0) >= 0.8 ? COLORS.success
              : (result.parsed?.confidence || 0) >= 0.6 ? COLORS.warning : COLORS.danger
          }]}>
            <Text style={styles.confidenceText}>{Math.round((result.parsed?.confidence || 0) * 100)}%</Text>
          </View>
        </View>

        {result.needsConfirmation && (
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
            <Text style={styles.confirmNote}>Low confidence — please verify the details above</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={handleReset}>
            <Text style={styles.editButtonText}>Start Over</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm & Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginBottom: 24, textAlign: 'center' },

  // Option cards
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    ...GLASS_STYLE,
    padding: 16, marginBottom: 12,
  },
  optionIconContainer: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  optionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Image preview
  imagePreviewContainer: {
    ...GLASS_STYLE,
    padding: 8, marginBottom: 16, alignItems: 'center',
  },
  imagePreview: { width: '100%', height: 360, borderRadius: 14 },
  imageActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  retakeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    ...GLASS_STYLE,
    padding: 12,
  },
  retakeText: { fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: '500' },
  uploadButton: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },

  // Text input
  textArea: {
    ...GLASS_STYLE,
    padding: 16, fontSize: FONT_SIZES.md, minHeight: 200,
    color: COLORS.text, marginBottom: 16,
  },
  processButton: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  processButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },

  // Back link
  backLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12,
  },
  backLinkText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Result card
  resultCard: {
    ...GLASS_STYLE,
    padding: 20,
  },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  resultTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, flex: 1 },
  sourceBadge: {
    backgroundColor: COLORS.glass, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  sourceBadgeText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '500' },
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
  warningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  confirmNote: { fontSize: FONT_SIZES.sm, color: COLORS.warning },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editButton: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
    ...GLASS_STYLE,
  },
  editButtonText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  confirmButton: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: COLORS.secondary, alignItems: 'center' },
  confirmButtonText: { fontSize: FONT_SIZES.md, color: '#fff', fontWeight: '600' },
});
