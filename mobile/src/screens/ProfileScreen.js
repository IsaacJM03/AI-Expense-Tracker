import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, GLASS_STYLE } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.displayName?.[0] || user?.email?.[0] || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName || 'User'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Tools</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ScanReceipt')}>
          <Ionicons name="camera-outline" size={20} color={COLORS.text} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Scan Receipt (OCR)</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Seasonal')}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.text} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Seasonal Analysis</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Currency')}>
          <Ionicons name="swap-horizontal-outline" size={20} color={COLORS.text} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Currency: {user?.currency || 'KES'}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Export')}>
          <Ionicons name="share-outline" size={20} color={COLORS.text} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Export Data</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.text} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v2.0.0 • AI Expense Tracker</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  profileCard: {
    alignItems: 'center', padding: 32, borderRadius: 24, marginBottom: 16,
    ...GLASS_STYLE,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: '700' },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  section: {
    borderRadius: 18, marginBottom: 16, overflow: 'hidden',
    ...GLASS_STYLE,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, padding: 16, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
  },
  menuIconStyle: { marginRight: 12, width: 24, textAlign: 'center' },
  menuText: { fontSize: FONT_SIZES.md, color: COLORS.text, flex: 1 },
  menuChevron: { fontSize: FONT_SIZES.lg, color: COLORS.textTertiary },
  logoutButton: {
    backgroundColor: COLORS.danger, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  version: { textAlign: 'center', marginTop: 24, color: COLORS.textTertiary, fontSize: FONT_SIZES.xs },
});
