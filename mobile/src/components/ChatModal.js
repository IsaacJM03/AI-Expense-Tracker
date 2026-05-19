/**
 * AI Assistant chat — powered entirely by the on-device Qwen 2.5 1.5B model.
 * No data leaves the device at inference time. The model is downloaded once
 * (~0.9 GB) and persists across app launches.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CURRENCY_SYMBOLS } from '../utils/currency';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';
import * as LLM from '../services/localLLM';

// ─── Model download states ────────────────────────────────────────────────────
const STATE = {
  CHECKING: 'checking',
  NEEDS_DOWNLOAD: 'needs_download',
  DOWNLOADING: 'downloading',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

export default function ChatModal({ visible, onClose }) {
  const { user } = useAuth();
  const [modelState, setModelState] = useState(STATE.CHECKING);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [stateError, setStateError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const windowHeight = Dimensions.get('window').height;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    setMessages([{ id: 'system', role: 'system', text: 'Ask about your expenses, budget, or financial habits.' }]);
    checkModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function checkModel() {
    setModelState(STATE.CHECKING);
    try {
      const downloaded = await LLM.isModelDownloaded();
      if (downloaded) {
        await loadModel();
      } else {
        setModelState(STATE.NEEDS_DOWNLOAD);
      }
    } catch (err) {
      setStateError(err.message || 'Could not check model');
      setModelState(STATE.ERROR);
    }
  }

  async function loadModel() {
    setModelState(STATE.LOADING);
    try {
      await LLM.getContext();
      setModelState(STATE.READY);
    } catch (err) {
      setStateError(err.message || 'Failed to load model');
      setModelState(STATE.ERROR);
    }
  }

  async function startDownload() {
    setModelState(STATE.DOWNLOADING);
    setDownloadProgress(0);
    try {
      await LLM.downloadModel((p) => setDownloadProgress(p));
      await loadModel();
    } catch (err) {
      setStateError(err.message || 'Download failed');
      setModelState(STATE.ERROR);
    }
  }

  async function handleCancel() {
    await LLM.cancelDownload();
    setModelState(STATE.NEEDS_DOWNLOAD);
    setDownloadProgress(0);
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || sending || modelState !== STATE.READY) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    const history = [...messages.filter(m => m.role !== 'system'), userMsg].map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.text,
    }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Build a lightweight financial snapshot for context
    let snapshot = null;
    try {
      const [sumRes, forecastRes] = await Promise.allSettled([
        api.getExpenseSummary(),
        api.getForecasts(),
      ]);
      const sum = sumRes.status === 'fulfilled' ? sumRes.value : null;
      const forecast = forecastRes.status === 'fulfilled' ? forecastRes.value : null;

      const currency = user?.currency || 'KES';
      const totalSpent = (sum?.summary || []).reduce((s, r) => s + parseFloat(r.total || 0), 0);
      const topCategory = (sum?.summary || []).sort((a, b) => b.total - a.total)[0]?.category_name;
      const txCount = (sum?.summary || []).reduce((s, r) => s + parseInt(r.count || 0), 0);

      snapshot = {
        currency,
        totalSpent,
        topCategory,
        transactionCount: txCount,
        income: forecast?.income ?? null,
        daysRemaining: forecast?.daysRemaining ?? null,
      };
    } catch {}

    try {
      let reply = await LLM.chat(history, snapshot);

      // Swap USD/$ references to the user's currency
      const symbol = CURRENCY_SYMBOLS[user?.currency || 'KES'] || (user?.currency || 'KES');
      reply = reply
        .replace(/\$\s?([\d,.]+)/g, `${symbol} $1`)
        .replace(/USD\s?([\d,.]+)/gi, `${symbol} $1`)
        .replace(/\$/g, symbol)
        .replace(/\bUSD\b/gi, user?.currency || 'KES');

      const botMsg = { id: `bot-${Date.now()}`, role: 'bot', text: reply };
      setMessages(prev => [...prev, botMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 120);
    } catch (err) {
      const errMsg = { id: `err-${Date.now()}`, role: 'bot', text: `Error: ${err.message}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderModelSetup = () => {
    if (modelState === STATE.CHECKING || modelState === STATE.LOADING) {
      const label = modelState === STATE.CHECKING ? 'Checking model…' : 'Loading model…';
      return (
        <View style={styles.setupBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.setupTitle}>{label}</Text>
        </View>
      );
    }

    if (modelState === STATE.NEEDS_DOWNLOAD) {
      return (
        <View style={styles.setupBox}>
          <Ionicons name="cloud-download-outline" size={48} color={COLORS.primary} />
          <Text style={styles.setupTitle}>Download AI Model</Text>
          <Text style={styles.setupBody}>
            The assistant runs fully on-device — your data never leaves your phone.{'\n\n'}
            One-time download: ~0.9 GB (Qwen 2.5 1.5B).{'\n'}
            Use Wi-Fi recommended.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={startDownload}>
            <Text style={styles.primaryBtnText}>Download Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (modelState === STATE.DOWNLOADING) {
      const pct = Math.round(downloadProgress * 100);
      const mbDone = Math.round(downloadProgress * 948);
      return (
        <View style={styles.setupBox}>
          <Ionicons name="cloud-download-outline" size={48} color={COLORS.primary} />
          <Text style={styles.setupTitle}>Downloading… {pct}%</Text>
          <Text style={styles.setupBody}>{mbDone} MB / ~948 MB</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${pct}%` }]} />
          </View>
          <TouchableOpacity style={styles.ghostBtn} onPress={handleCancel}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (modelState === STATE.ERROR) {
      return (
        <View style={styles.setupBox}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.setupTitle}>Something went wrong</Text>
          <Text style={styles.setupBody}>{stateError}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={checkModel}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <SafeAreaView style={[styles.container, { maxHeight: Math.min(windowHeight * 0.9, 900) }]}>

          {/* Header */}
          <View style={[styles.header, GLASS_STYLE]}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Assistant</Text>
              {modelState === STATE.READY && (
                <View style={styles.onDeviceBadge}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.success} />
                  <Text style={styles.onDeviceText}>on-device</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Model setup overlay */}
          {modelState !== STATE.READY && (
            <View style={styles.setupOverlay}>
              {renderModelSetup()}
            </View>
          )}

          {/* Chat messages */}
          {modelState === STATE.READY && (
            <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList}>
              {messages.map(item => (
                <View key={item.id} style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
                  <View style={[styles.msgBubble, item.role === 'user' ? styles.msgUser : styles.msgBot]}>
                    <Text style={[styles.msgText, item.role === 'user' ? styles.msgTextUser : styles.msgTextBot]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              ))}
              {sending && (
                <View style={[styles.msgRow, styles.msgRowBot]}>
                  <View style={[styles.msgBubble, styles.msgBot]}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Input */}
          {modelState === STATE.READY && (
            <View style={[styles.inputRow, GLASS_STYLE]}>
              <TextInput
                placeholder="Ask the assistant…"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={input}
                onChangeText={setInput}
                editable={!sending}
                multiline
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending || !input.trim()}>
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={18} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          )}

        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' },
  container: {
    flex: 1,
    marginTop: 'auto',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  onDeviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success + '18',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  onDeviceText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  closeBtn: { padding: 6 },
  setupOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  setupBox: { alignItems: 'center', gap: 12, width: '100%' },
  setupTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  setupBody: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 32, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.md },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  ghostBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  progressTrack: { width: '100%', height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  messageList: { padding: 12, paddingBottom: 20 },
  msgRow: { marginBottom: 10, flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
  msgUser: { backgroundColor: COLORS.primary },
  msgBot: { backgroundColor: COLORS.glass },
  msgText: { fontSize: FONT_SIZES.sm },
  msgTextUser: { color: '#fff' },
  msgTextBot: { color: COLORS.text },
  inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: COLORS.glass },
  input: { flex: 1, minHeight: 40, maxHeight: 120, padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)', color: COLORS.text },
  sendBtn: { marginLeft: 8, backgroundColor: COLORS.primary, padding: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
