import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

export default function Index() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const userRole = await AsyncStorage.getItem('userRole');
      const storedUsername = await AsyncStorage.getItem('username');
      
      if (userRole && storedUsername) {
        // Redirect to appropriate dashboard based on stored role
        router.replace(`/${userRole.toLowerCase()}-dashboard`);
      } else {
        setIsCheckingSession(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsCheckingSession(false);
    }
  };

  const handleLogin = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    // Check if password is correct (demo password: 1234)
    if (password !== '1234') {
      Alert.alert('Error', 'Invalid password. Demo password is: 1234');
      return;
    }

    // Determine role based on username
    const lowercaseUsername = username.toLowerCase().trim();
    let role = '';

    if (lowercaseUsername === 'producer') {
      role = 'producer';
    } else if (lowercaseUsername === 'buyer') {
      role = 'buyer';
    } else if (lowercaseUsername === 'regulator') {
      role = 'regulator';
    } else {
      Alert.alert(
        'Invalid Username', 
        'Please enter one of the following usernames:\n• producer\n• buyer\n• regulator'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Call backend authentication
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        username: lowercaseUsername,
        role: role,
      });

      if (response.data.success) {
        // Store user data
        await AsyncStorage.setItem('userRole', role);
        await AsyncStorage.setItem('username', lowercaseUsername);
        
        // Navigate to appropriate dashboard
        router.replace(`/${role.toLowerCase()}-dashboard`);
      } else {
        Alert.alert('Error', 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Checking session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Green Ledger</Text>
            <Text style={styles.subtitle}>Hydrogen Credits Dashboard</Text>
          </View>

          {/* Login Form */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>Login</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username (producer, buyer, or regulator)"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Demo Instructions */}
            <View style={styles.demoInfo}>
              <Text style={styles.demoTitle}>Demo Credentials:</Text>
              <Text style={styles.demoText}>Username: producer, buyer, or regulator</Text>
              <Text style={styles.demoText}>Password: 1234</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Blockchain-powered transparency for green hydrogen credits
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: 500,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  loginButton: {
    backgroundColor: '#10b981',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  demoInfo: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
});