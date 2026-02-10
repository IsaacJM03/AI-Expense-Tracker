import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';
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
        <Text style={styles.sectionTitle}>Tools</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ScanReceipt')}>
          <Text style={styles.menuText}>📷 Scan Receipt (OCR)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Seasonal')}>
          <Text style={styles.menuText}>📅 Seasonal Analysis</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Currency')}>
          <Text style={styles.menuText}>💱 Currency: {user?.currency || 'KES'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Export')}>
          <Text style={styles.menuText}>📤 Export Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🔒 Change Password</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v1.1.0 • AI Expense Tracker</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  profileCard: { alignItems: 'center', padding: 32, backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  section: { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, padding: 16, paddingBottom: 8, textTransform: 'uppercase' },
  menuItem: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  menuText: { fontSize: FONT_SIZES.md, color: COLORS.text },
  logoutButton: {
    backgroundColor: COLORS.danger, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  version: { textAlign: 'center', marginTop: 24, color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
});
