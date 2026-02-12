import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load token and user from SecureStore on startup
    let mounted = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        const storedUser = await SecureStore.getItemAsync('user');
        if (mounted) {
          console.debug('[Auth] restored token?', !!storedToken);
          if (storedToken) {
            setToken(storedToken);
            api.setToken(storedToken);
          }
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (e) {
              setUser(null);
            }
          }
        }
      } catch (e) {
        // ignore errors reading secure store
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setToken(data.token);
    api.setToken(data.token);
    try {
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    } catch (e) {}
    console.debug('[Auth] login stored token? ', !!data.token);
    return data;
  };

  const register = async (email, password, displayName) => {
    const data = await api.register(email, password, displayName);
    setUser(data.user);
    setToken(data.token);
    api.setToken(data.token);
    try {
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    } catch (e) {}
    console.debug('[Auth] register stored token? ', !!data.token);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.setToken(null);
    try {
      SecureStore.deleteItemAsync('token');
      SecureStore.deleteItemAsync('user');
    } catch (e) {}
    console.debug('[Auth] logged out and cleared secure store');
  };

  const updateUser = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    // persist updated user
    try {
      if (user) {
        const next = { ...(user || {}), ...(updates || {}) };
        SecureStore.setItemAsync('user', JSON.stringify(next));
      }
    } catch (e) {}
  };

  // Keep API client in sync with token state in case other parts modify it
  useEffect(() => {
    api.setToken(token);
    console.debug('[Auth] api token synced:', !!token);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
