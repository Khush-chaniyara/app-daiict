import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  producer_id: string;
  producer_name?: string;
  units: number;
  production_date: string;
  blockchain_hash: string;
  is_retired: boolean;
}

interface Purchase {
  id: string;
  credit_id: string;
  units: number;
  blockchain_hash: string;
  timestamp: string;
}

export default function BuyerDashboard() {
  const [availableCredits, setAvailableCredits] = useState<Credit[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [buyerId, setBuyerId] = useState('');
  const [activeTab, setActiveTab] = useState<'marketplace' | 'purchases'>('marketplace');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadUserData();
    fetchData();
  }, []);

  const loadUserData = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      if (username) {
        setBuyerId(username);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAvailableCredits(), fetchPurchases()]);
    setIsRefreshing(false);
  };

  const fetchAvailableCredits = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/buyer/available-credits`);
      if (response.data.success) {
        setAvailableCredits(response.data.credits);
      }
    } catch (error) {
      console.error('Error fetching available credits:', error);
      Alert.alert('Error', 'Failed to fetch available credits');
    }
  };

  const fetchPurchases = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      if (!username) return;

      const response = await axios.get(`${BACKEND_URL}/api/buyer/${username}/purchases`);
      if (response.data.success) {
        setPurchases(response.data.purchases);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      Alert.alert('Error', 'Failed to fetch purchase history');
    }
  };

  const handlePurchaseCredit = async (credit: Credit) => {
    Alert.alert(
      'Confirm Purchase',
      `Purchase ${credit.units} kg H₂ from ${credit.producer_name || 'Producer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: () => executePurchase(credit),
        },
      ]
    );
  };

  const executePurchase = async (credit: Credit) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/buyer/purchase-credit`, {
        credit_id: credit.id,
        buyer_id: buyerId,
        units: credit.units,
      });

      if (response.data.success) {
        Alert.alert(
          'Purchase Successful!',
          `Transaction Hash: ${response.data.transaction_hash}`,
          [
            {
              text: 'OK',
              onPress: () => {
                fetchData();
                setActiveTab('purchases');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error purchasing credit:', error);
      Alert.alert('Error', 'Failed to purchase credit');
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={fetchData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Buyer Dashboard</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'marketplace' && styles.activeTab]}
            onPress={() => setActiveTab('marketplace')}
          >
            <Text style={[styles.tabText, activeTab === 'marketplace' && styles.activeTabText]}>
              Marketplace ({availableCredits.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'purchases' && styles.activeTab]}
            onPress={() => setActiveTab('purchases')}
          >
            <Text style={[styles.tabText, activeTab === 'purchases' && styles.activeTabText]}>
              My Purchases ({purchases.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'marketplace' ? (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Available Credits</Text>
            
            {availableCredits.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No credits available for purchase</Text>
              </View>
            ) : (
              availableCredits.map((credit) => (
                <View key={credit.id} style={styles.creditCard}>
                  <View style={styles.creditHeader}>
                    <Text style={styles.creditBatch}>Batch: {credit.batch_id}</Text>
                    <Text style={styles.producerName}>
                      by {credit.producer_name || 'Producer'}
                    </Text>
                  </View>
                  
                  <Text style={styles.creditUnits}>{credit.units} kg H₂</Text>
                  <Text style={styles.creditDate}>
                    Produced: {formatDate(credit.production_date)}
                  </Text>
                  
                  <View style={styles.hashContainer}>
                    <Text style={styles.hashLabel}>Hash:</Text>
                    <Text style={styles.hashValue}>
                      {credit.blockchain_hash.substring(0, 20)}...
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.purchaseButton, isLoading && styles.disabledButton]}
                    onPress={() => handlePurchaseCredit(credit)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.purchaseButtonText}>Purchase</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Purchase History</Text>
            
            {purchases.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No purchases yet</Text>
              </View>
            ) : (
              purchases.map((purchase) => (
                <View key={purchase.id} style={styles.purchaseCard}>
                  <View style={styles.purchaseHeader}>
                    <Text style={styles.purchaseUnits}>{purchase.units} kg H₂</Text>
                    <Text style={styles.purchaseDate}>
                      {formatDateTime(purchase.timestamp)}
                    </Text>
                  </View>
                  
                  <View style={styles.hashContainer}>
                    <Text style={styles.hashLabel}>Transaction Hash:</Text>
                    <Text style={styles.hashValue}>
                      {purchase.blockchain_hash.substring(0, 20)}...
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
    color: '#3b82f6',
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#1e40af',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    margin: 24,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 20,
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
    borderColor: '#3b82f6',
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
  producerName: {
    fontSize: 12,
    color: '#94a3b8',
  },
  creditUnits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
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
    marginBottom: 12,
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
  purchaseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseUnits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
});