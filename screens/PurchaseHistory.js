import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  View,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const PurchaseHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  
  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        // Check if user is logged in
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          Alert.alert('錯誤', '請先登錄');
          navigation.navigate('Login');
          return;
        }

        // Fetch user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || '用戶不存在');
        }
        setUserId(userData.user_id);

        // Fetch completed orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('order_id, order_date, total_amount')
          .eq('user_id', userData.user_id)
          .eq('status', 'completed')
          .order('order_date', { ascending: false });

        if (ordersError) throw ordersError;

        setOrders(ordersData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching purchase history:', error.message || error);
        Alert.alert('錯誤', '無法加載購買紀錄，請稍後重試');
        setLoading(false);
      }
    };

    fetchPurchaseHistory();
  }, [navigation]);

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>訂單編號: #{item.order_id}</Text>
        <Text style={styles.orderDate}>
          訂單日期: {new Date(item.order_date).toLocaleDateString()}
        </Text>
        <Text style={styles.orderTotal}>總金額: ${item.total_amount.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.order_id })}
      >
        <Text style={styles.buttonText}>查看</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加載中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>購買紀錄</Text>
      </View>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>您尚未有已完成的訂單</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.order_id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>返回</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 14,
    color: '#2CB696',
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
});

export default PurchaseHistory;