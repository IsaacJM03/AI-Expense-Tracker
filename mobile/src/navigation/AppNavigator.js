import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES } from '../constants/theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExportScreen from '../screens/ExportScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import SeasonalScreen from '../screens/SeasonalScreen';
import CurrencyScreen from '../screens/CurrencyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Home: '🏠', Insights: '📊', Budgets: '💰', Profile: '👤' };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.4 }}>{icons[label] || '📋'}</Text>
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 4 }} />}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: COLORS.glassBorder,
          paddingTop: 8,
          height: 80,
        },
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Expenses' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Budgets" component={BudgetScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' },
  headerShadowVisible: false,
};

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ headerShown: true, title: 'Add Expense', presentation: 'modal', ...stackScreenOptions }} />
            <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ headerShown: true, title: 'Scan Receipt', presentation: 'modal', ...stackScreenOptions }} />
            <Stack.Screen name="Export" component={ExportScreen} options={{ headerShown: true, title: 'Export Data', presentation: 'modal', ...stackScreenOptions }} />
            <Stack.Screen name="Seasonal" component={SeasonalScreen} options={{ headerShown: true, title: 'Seasonal Analysis', presentation: 'modal', ...stackScreenOptions }} />
            <Stack.Screen name="Currency" component={CurrencyScreen} options={{ headerShown: true, title: 'Currency', presentation: 'modal', ...stackScreenOptions }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
