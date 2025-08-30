import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface Credit {
  id: string;
  batch_id: string;
  units: number;
  production_date: string;
  blockchain_hash: string;
  is_retired: boolean;
}

export default function ProducerDashboard() {
  const [batchId, setBatchId] = useState('');
  const [units, setUnits] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [producerId, setProducerId] = useState('');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadUserData();
    fetchCredits();
  }, []);

  const loadUserData = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      if (username) {
        setProducerId(username);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      setIsRefreshing(true);
      const username = await AsyncStorage.getItem('username');
      if (!username) return;

      const response = await axios.get(`${BACKEND_URL}/api/producer/${username}/credits`);
      if (response.data.success) {
        setCredits(response.data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      Alert.alert('Error', 'Failed to fetch credits');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMintCredit = async () => {
    if (!batchId || !units || !productionDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(Number(units)) || Number(units) <= 0) {
      Alert.alert('Error', 'Please enter a valid number of units');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/producer/mint-credit?producer_id=${producerId}`,
        {
          batch_id: batchId,
          units: Number(units),
          production_date: new Date(productionDate).toISOString(),
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Success!',
          `Credit minted successfully!\n\nTransaction Hash: ${response.data.transaction_hash}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setBatchId('');
                setUnits('');
                setProductionDate('');
                fetchCredits();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error minting credit:', error);
      Alert.alert('Error', 'Failed to mint credit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={fetchCredits} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Producer Dashboard</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Production Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Log Production & Mint Credits</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Batch ID</Text>
            <TextInput
              style={styles.input}
              value={batchId}
              onChangeText={setBatchId}
              placeholder="Enter batch identifier"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Units Produced</Text>
            <TextInput
              style={styles.input}
              value={units}
              onChangeText={setUnits}
              placeholder="Enter units (kg H2)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Production Date</Text>
            <TextInput
              style={styles.input}
              value={productionDate}
              onChangeText={setProductionDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => setProductionDate(getCurrentDate())}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.mintButton, isLoading && styles.disabledButton]}
            onPress={handleMintCredit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.mintButtonText}>Mint Credits</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Credits List */}
        <View style={styles.creditsContainer}>
          <Text style={styles.sectionTitle}>My Credits ({credits.length})</Text>
          
          {credits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No credits yet. Create your first batch!</Text>
            </View>
          ) : (
            credits.map((credit) => (
              <View key={credit.id} style={styles.creditCard}>
                <View style={styles.creditHeader}>
                  <Text style={styles.creditBatch}>Batch: {credit.batch_id}</Text>
                  <Text style={[
                    styles.creditStatus,
                    credit.is_retired ? styles.retiredStatus : styles.activeStatus
                  ]}>
                    {credit.is_retired ? 'Retired' : 'Active'}
                  </Text>
                </View>
                
                <Text style={styles.creditUnits}>{credit.units} kg H₂</Text>
                <Text style={styles.creditDate}>
                  Produced: {formatDate(credit.production_date)}
                </Text>
                
                <View style={styles.hashContainer}>
                  <Text style={styles.hashLabel}>Transaction Hash:</Text>
                  <Text style={styles.hashValue}>
                    {credit.blockchain_hash.substring(0, 20)}...
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  logoutText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  formContainer: {
    margin: 24,
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  todayButton: {
    position: 'absolute',
    right: 8,
    top: 32,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  mintButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  mintButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  creditsContainer: {
    margin: 24,
    marginTop: 0,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
  creditCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditBatch: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  creditStatus: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatus: {
    backgroundColor: '#065f46',
    color: '#10b981',
  },
  retiredStatus: {
    backgroundColor: '#7c2d12',
    color: '#f59e0b',
  },
  creditUnits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  creditDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hashLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
  },
  hashValue: {
    fontSize: 12,
    color: '#3b82f6',
    fontFamily: 'monospace',
  },
});