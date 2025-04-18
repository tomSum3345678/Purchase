// screens/Messages.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustBar from './CustBar';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Messages = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Status mappings for Chinese UI
  const statusMapping = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    canceled: '已取消',
  };

  useEffect(() => {
    const fetchOrdersWithMessages = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email) {
          Alert.alert('错误', '请先登录');
          navigation.navigate('Login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, role')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || 'User not found');
        }

        const userId = userData.user_id;
        setUserRole(userData.role);

        let ordersQuery;
        if (userData.role === 'admin') {
          // Sales: Fetch all orders with messages
          ordersQuery = supabase
            .from('orders')
            .select('order_id, user_id, total_amount, status, payment_status')
            .order('order_date', { ascending: false });
        } else {
          // Customer: Fetch their own orders
          ordersQuery = supabase
            .from('orders')
            .select('order_id, user_id, total_amount, status, payment_status')
            .eq('user_id', userId)
            .order('order_date', { ascending: false });
        }

        const { data: ordersData, error: ordersError } = await ordersQuery;
        if (ordersError) throw ordersError;

        // Fetch latest message for each order
        const orderIds = ordersData.map((order) => order.order_id);
        const { data: messagesData, error: messagesError } = await supabase
          .from('order_messages')
          .select('order_id, message_text, sent_at, is_sales')
          .in('order_id', orderIds)
          .order('sent_at', { ascending: false })
          .limit(1, { per: 'order_id' }); // Get the latest message per order

        if (messagesError) throw messagesError;

        const enrichedOrders = ordersData.map((order) => {
          const latestMessage = messagesData.find((msg) => msg.order_id === order.order_id);
          return {
            ...order,
            latestMessage: latestMessage ? latestMessage.message_text : null,
            isSalesMessage: latestMessage ? latestMessage.is_sales : false,
          };
        });

        setOrders(enrichedOrders);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders with messages:', error.message || error);
        Alert.alert('错误', '无法加载消息列表');
        setLoading(false);
      }
    };

    fetchOrdersWithMessages();
  }, [navigation]);

  const renderChatRoom = ({ item }) => (
    <TouchableOpacity
      style={styles.chatRoomCard}
      onPress={() => navigation.navigate('OrderChat', { orderId: item.order_id })}
    >
      <Text style={styles.orderId}>订单编号: #{item.order_id}</Text>
      <Text style={styles.orderTotal}>总金额: ${item.total_amount}</Text>
      <Text style={styles.orderStatus}>状态: {statusMapping[item.status] || item.status}</Text>
      {item.latestMessage && (
        <Text style={styles.messagePreview}>
          {item.isSalesMessage ? '销售' : '客户'}: {item.latestMessage.slice(0, 30)}...
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{userRole === 'admin' ? '所有订单消息' : '我的订单消息'}</Text>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无消息</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderChatRoom}
          keyExtractor={(item) => item.order_id.toString()}
          contentContainerStyle={styles.chatList}
        />
      )}
      <CustBar navigation={navigation} activeScreen="Messages" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chatList: {
    paddingBottom: 80, // Space for the bottom bar
  },
  chatRoomCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  orderTotal: {
    fontSize: 14,
    color: '#2CB696',
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  messagePreview: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
});

export default Messages;