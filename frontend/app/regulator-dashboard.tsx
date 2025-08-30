import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface Transaction {
  id: string;
  credit_id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_name?: string;
  to_user_name?: string;
  units: number;
  transaction_type: string;
  blockchain_hash: string;
  timestamp: string;
}

interface CreditsOverview {
  total_credits: number;
  active_credits: number;
  retired_credits: number;
}

export default function RegulatorDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overview, setOverview] = useState<CreditsOverview>({
    total_credits: 0,
    active_credits: 0,
    retired_credits: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTransactions(), fetchOverview()]);
    setIsRefreshing(false);
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/regulator/transactions`);
      if (response.data.success) {
        // Sort transactions by timestamp (newest first)
        const sortedTransactions = response.data.transactions.sort(
          (a: Transaction, b: Transaction) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setTransactions(sortedTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to fetch transactions');
    }
  };

  const fetchOverview = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/regulator/credits-overview`);
      if (response.data.success) {
        setOverview(response.data.overview);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
      Alert.alert('Error', 'Failed to fetch credits overview');
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'mint':
        return '#10b981';
      case 'transfer':
        return '#3b82f6';
      case 'retire':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'mint':
        return '🏭';
      case 'transfer':
        return '💸';
      case 'retire':
        return '♻️';
      default:
        return '📋';
    }
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
          <Text style={styles.title}>Regulator Dashboard</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
              Transactions ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'overview' ? (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Credits Overview</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{overview.total_credits}</Text>
                <Text style={styles.statLabel}>Total Credits</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#10b981' }]}>
                  {overview.active_credits}
                </Text>
                <Text style={styles.statLabel}>Active Credits</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
                  {overview.retired_credits}
                </Text>
                <Text style={styles.statLabel}>Retired Credits</Text>
              </View>
            </View>

            {/* Compliance Summary */}
            <View style={styles.complianceContainer}>
              <Text style={styles.complianceTitle}>Compliance Status</Text>
              <View style={styles.complianceCard}>
                <View style={styles.complianceRow}>
                  <Text style={styles.complianceLabel}>Total H₂ Credits Issued:</Text>
                  <Text style={styles.complianceValue}>{overview.total_credits}</Text>
                </View>
                <View style={styles.complianceRow}>
                  <Text style={styles.complianceLabel}>Credits in Circulation:</Text>
                  <Text style={[styles.complianceValue, { color: '#10b981' }]}>
                    {overview.active_credits}
                  </Text>
                </View>
                <View style={styles.complianceRow}>
                  <Text style={styles.complianceLabel}>Credits Consumed:</Text>
                  <Text style={[styles.complianceValue, { color: '#f59e0b' }]}>
                    {overview.retired_credits}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>All Transactions</Text>
            
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No transactions recorded yet</Text>
              </View>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionType}>
                      <Text style={styles.transactionIcon}>
                        {getTransactionTypeIcon(transaction.transaction_type)}
                      </Text>
                      <Text
                        style={[
                          styles.transactionTypeText,
                          { color: getTransactionTypeColor(transaction.transaction_type) },
                        ]}
                      >
                        {transaction.transaction_type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.transactionDate}>
                      {formatDateTime(transaction.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionUnits}>
                      {transaction.units} kg H₂
                    </Text>
                    
                    <View style={styles.transactionFlow}>
                      <Text style={styles.flowText}>
                        From: <Text style={styles.flowUser}>{transaction.from_user_name || 'System'}</Text>
                      </Text>
                      <Text style={styles.flowArrow}>→</Text>
                      <Text style={styles.flowText}>
                        To: <Text style={styles.flowUser}>{transaction.to_user_name || 'Unknown'}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.hashContainer}>
                    <Text style={styles.hashLabel}>Blockchain Hash:</Text>
                    <Text style={styles.hashValue}>
                      {transaction.blockchain_hash.substring(0, 20)}...
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
    color: '#f59e0b',
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
    backgroundColor: '#d97706',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  complianceContainer: {
    marginBottom: 24,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  complianceCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  complianceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
  },
  complianceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
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
  transactionCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  transactionTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  transactionDetails: {
    marginBottom: 12,
  },
  transactionUnits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  transactionFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flowText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  flowUser: {
    color: '#f8fafc',
    fontWeight: '500',
  },
  flowArrow: {
    fontSize: 16,
    color: '#64748b',
    marginHorizontal: 8,
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