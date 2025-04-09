// screens/OrderChat.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OrderChat = ({ navigation, route }) => {
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { orderId } = route.params || {};
        if (!orderId) {
          throw new Error('Missing order ID');
        }

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

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('order_id', orderId)
          .single();

        if (orderError || !orderData) {
          throw new Error(orderError?.message || 'Order not found');
        }

        // For customers, ensure the order belongs to them
        if (userData.role !== 'admin' && orderData.user_id !== userId) {
          throw new Error('Unauthorized access to this order');
        }

        setOrder(orderData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order:', error.message || error);
        Alert.alert('错误', '无法加载聊天室');
        navigation.goBack();
      }
    };

    fetchOrder();
  }, [navigation, route]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!order) return; // Wait until order is loaded

    const subscription = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_id=eq.${order.order_id}`,
        },
        (payload) => {
          setOrder(payload.new); // Update order state with the new data
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [order]);

  const sendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('错误', '消息不能为空');
      return;
    }

    try {
      const updateField = userRole === 'admin' ? 'sales_message' : 'cust_message';
      const { error } = await supabase
        .from('orders')
        .update({ [updateField]: message })
        .eq('order_id', order.order_id);

      if (error) throw error;

      setOrder((prev) => ({ ...prev, [updateField]: message }));
      setMessage('');
      Alert.alert('成功', '消息已发送');
    } catch (error) {
      console.error('Error sending message:', error.message || error);
      Alert.alert('错误', '发送消息失败');
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'customer' ? styles.customerBubble : styles.salesBubble,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageTime}>{item.time}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!order) return null;

  // Create a simple message history from cust_message and sales_message
  const messages = [];
  if (order.cust_message) {
    messages.push({
      sender: 'customer',
      text: order.cust_message,
      time: new Date(order.order_date).toLocaleTimeString(), // Note: this uses order_date, consider adding a timestamp if needed
    });
  }
  if (order.sales_message) {
    messages.push({
      sender: 'sales',
      text: order.sales_message,
      time: new Date(order.order_date).toLocaleTimeString(),
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>订单 #{order.order_id} 聊天室</Text>
      <Text style={styles.orderInfo}>总金额: ${order.total_amount} | 状态: {order.status}</Text>
      <Text style={styles.orderInfo}>
        付款状态: {order.payment_status === null ? '未付款' : order.payment_status}
      </Text>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={userRole === 'admin' ? '发送销售消息...' : '发送客户消息...'}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  orderInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  messageList: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    maxWidth: '80%',
  },
  customerBubble: {
    backgroundColor: '#2CB696',
    alignSelf: 'flex-end',
  },
  salesBubble: {
    backgroundColor: '#ddd',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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
});

export default OrderChat;