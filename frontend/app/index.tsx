import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const userRole = await AsyncStorage.getItem('userRole');
      const username = await AsyncStorage.getItem('username');
      
      if (userRole && username) {
        // Redirect to appropriate dashboard based on stored role
        router.replace(`/${userRole.toLowerCase()}-dashboard`);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsLoading(false);
    }
  };

  const handleRoleSelection = async (role: string) => {
    try {
      // For MVP, we'll use simple role-based access
      const username = role.toLowerCase(); // Using role as username for simplicity
      
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('username', username);
      
      // Navigate to appropriate dashboard
      router.push(`/${role.toLowerCase()}-dashboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set user role');
      console.error('Role selection error:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Green Ledger</Text>
          <Text style={styles.subtitle}>Hydrogen Credits Dashboard</Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleTitle}>Select Your Role</Text>
          
          <TouchableOpacity
            style={[styles.roleButton, styles.producerButton]}
            onPress={() => handleRoleSelection('producer')}
          >
            <Text style={styles.roleButtonText}>Producer</Text>
            <Text style={styles.roleDescription}>Log production & mint credits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.buyerButton]}
            onPress={() => handleRoleSelection('buyer')}
          >
            <Text style={styles.roleButtonText}>Buyer</Text>
            <Text style={styles.roleDescription}>Purchase & manage credits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.regulatorButton]}
            onPress={() => handleRoleSelection('regulator')}
          >
            <Text style={styles.roleButtonText}>Regulator</Text>
            <Text style={styles.roleDescription}>Monitor & ensure compliance</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Blockchain-powered transparency for green hydrogen credits
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
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
  roleContainer: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: 400,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 32,
  },
  roleButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  producerButton: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  buyerButton: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  regulatorButton: {
    backgroundColor: '#7c2d12',
    borderColor: '#f59e0b',
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
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