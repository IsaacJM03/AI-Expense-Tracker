import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CURRENCY_SYMBOLS } from '../utils/currency';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import api from '../services/api';

export default function ChatModal({ visible, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const windowHeight = Dimensions.get('window').height;
  const [assistantPermission, setAssistantPermission] = useState(false);
  const [loadingPermission, setLoadingPermission] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Seed system message
    setMessages([{ id: 'system', role: 'system', text: 'Ask about forecasts, budgets, or expenses.' }]);
    // scroll to bottom after a short delay
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 120);
    // fetch current permission
    (async () => {
      setLoadingPermission(true);
      try {
        const res = await api.getAssistantPermission();
        setAssistantPermission(!!res.assistantPermission);
      } catch (e) {
        console.log('Could not load assistant permission:', e.message);
      } finally { setLoadingPermission(false); }
    })();
  }, [visible]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await api.chatWithLLM(userMsg.text);
      let replyText = (res && res.reply) ? res.reply : 'Sorry, no response.';
      // Replace $ or USD with user's currency symbol when possible
      const userCurrency = user?.currency || 'KES';
      const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
      replyText = replyText.replace(/\$\s?([\d,.]+)/g, `${symbol} $1`).replace(/USD\s?([\d,.]+)/gi, `${symbol} $1`).replace(/\$/g, symbol).replace(/USD/gi, symbol);
      const botMsg = { id: `bot-${Date.now()}`, role: 'bot', text: replyText };
      setMessages(prev => [...prev, botMsg]);
      // scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 160);
    } catch (err) {
      const errMsg = { id: `err-${Date.now()}`, role: 'bot', text: `Error: ${err.message}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleGrant = async () => {
    setLoadingPermission(true);
    try {
      await api.grantAssistantPermission();
      setAssistantPermission(true);
    } catch (e) {
      console.log('Grant failed:', e.message);
    } finally { setLoadingPermission(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <SafeAreaView style={[styles.container, { maxHeight: Math.min(windowHeight * 0.9, 900) }]}> 
          <View style={[styles.header, GLASS_STYLE]}>
            <Text style={styles.title}>Assistant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Permission banner */}
          {!assistantPermission && (
            <View style={styles.permissionBanner}>
              <Text style={styles.permissionText}>Assistant needs permission to access your financial data for personalized answers.</Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={handleGrant} disabled={loadingPermission}>
                <Text style={styles.permissionBtnText}>{loadingPermission ? 'Granting...' : 'Grant Access'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList}>
            {messages.map(item => (
              <View key={item.id} style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
                <View style={[styles.msgBubble, item.role === 'user' ? styles.msgUser : styles.msgBot]}>
                  <Text style={[styles.msgText, item.role === 'user' ? styles.msgTextUser : styles.msgTextBot]}>{item.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.inputRow, GLASS_STYLE]}>
            <TextInput
              placeholder="Ask the assistant..."
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              editable={!sending}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' },
  wrapper: { flex: 1 },
  container: {
    flex: 1,
    marginTop: 'auto',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%'
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.glass },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  closeBtn: { padding: 6 },
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
  permissionBanner: { padding: 12, backgroundColor: COLORS.glass, margin: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permissionText: { flex: 1, color: COLORS.text, marginRight: 8, fontSize: FONT_SIZES.sm },
  permissionBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  permissionBtnText: { color: '#fff', fontWeight: '700' },
});
