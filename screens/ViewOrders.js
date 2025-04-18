import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustBar from './CustBar';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ViewOrders = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status mappings
  const statusMap = {
    pending: '待处理',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
  };

  const paymentStatusMap = {
    null: '未付款',
    pending_review: '待审核',
    paid: '已付款',
  };

  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email) {
          Alert.alert('错误', '请先登录');
          navigation.navigate('Login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || 'User not found');
        }
        const userId = userData.user_id;

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'completed') // Exclude completed orders
          .order('order_date', { ascending: false });

        if (ordersError) throw ordersError;

        const orderIds = ordersData.map((order) => order.order_id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, price, products(product_name)')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const enrichedOrders = ordersData.map((order) => ({
          ...order,
          cartItems: itemsData
            .filter((item) => item.order_id === order.order_id)
            .map((item) => ({
              product_id: item.product_id,
              product_name: item.products.product_name,
              quantity: item.quantity,
              price: item.price,
            })),
        }));

        setOrders(enrichedOrders);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error.message || error);
        Alert.alert('错误', '无法加载订单数据');
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigation]);

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      '确认取消',
      '您确定要取消此订单吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('order_id', orderId);

              if (error) throw error;

              setOrders(orders.filter((order) => order.order_id !== orderId));
              Alert.alert('成功', '订单已取消');
            } catch (error) {
              console.error('Error canceling order:', error.message || error);
              Alert.alert('错误', '取消订单失败');
            }
          },
        },
      ]
    );
  };

  const handleConfirmReceipt = async (orderId) => {
    Alert.alert(
      '確認收貨',
      '您確認已收到貨物嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          onPress: async () => {
            try {
              // Update order status to completed
              const { error: updateError } = await supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('order_id', orderId);

              if (updateError) throw updateError;

              // Fetch admin user for sending message
              const { data: adminData, error: adminError } = await supabase
                .from('users')
                .select('user_id')
                .eq('role', 'admin')
                .limit(1)
                .single();

              if (adminError || !adminData) throw new Error('Admin user not found');

              // Send message in chat
              const { error: messageError } = await supabase
                .from('order_messages')
                .insert({
                  order_id: orderId,
                  user_id: adminData.user_id,
                  message_text: `感謝您的購買！訂單 #${orderId} 已完成，您現在可以為購買的書籍留言評分！`,
                  is_sales: true,
                });

              if (messageError) throw messageError;

              // Remove order from the list
              setOrders(orders.filter((order) => order.order_id !== orderId));
              Alert.alert('感謝光顧', '訂單已確認完成，感謝您的購買！');
            } catch (error) {
              console.error('Error confirming receipt:', error.message || error);
              Alert.alert('錯誤', '確認收貨失敗');
            }
          },
        },
      ]
    );
  };

  const handlePayOrder = (order) => {
    navigation.navigate('Payment', {
      orderId: order.order_id,
      totalAmount: order.total_amount,
      paymentMethod: order.payment_method,
    });
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderId}>订单编号: #{item.order_id}</Text>
      <Text style={styles.orderDate}>
        下单时间: {new Date(item.order_date).toLocaleString()}
      </Text>
      <Text style={styles.orderTotal}>总金额: ${item.total_amount}</Text>
      <Text style={styles.orderStatus}>状态: {statusMap[item.status] || item.status}</Text>
      <Text style={styles.paymentStatus}>
        付款状态: {paymentStatusMap[item.payment_status] || paymentStatusMap['null']}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() =>
            navigation.navigate('OrderDetails', { orderId: item.order_id })
          }
        >
          <Text style={styles.buttonText}>查看详情</Text>
        </TouchableOpacity>

        {item.status === 'pending' && (
          <>
            {item.payment_status === null && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelOrder(item.order_id)}
              >
                <Text style={styles.buttonText}>取消订单</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => handlePayOrder(item)}
            >
              <Text style={styles.buttonText}>
                {item.payment_status === null ? '立即支付' : '查看付款情况'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'shipped' && item.delivery_status_current_location === 'delivered' && (
          <TouchableOpacity
            style={styles.confirmReceiptButton}
            onPress={() => handleConfirmReceipt(item.order_id)}
          >
            <Text style={styles.buttonText}>確認收貨</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
      <Text style={styles.title}>我的订单</Text>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>您还没有订单</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.order_id.toString()}
          contentContainerStyle={styles.orderList}
        />
      )}
      <CustBar navigation={navigation} activeScreen="ViewOrders" />
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
  orderList: {
    paddingBottom: 80,
  },
  orderCard: {
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
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  orderTotal: {
    fontSize: 14,
    color: '#2CB696',
    fontWeight: '500',
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paymentStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  viewButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  payButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmReceiptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
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

export default ViewOrders;