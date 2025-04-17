import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminBar from './AdminBar';

const HandleOrder = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status mappings
  const paymentStatusMap = {
    null: '未付款',
    pending_review: '待审核',
    paid: '已付款',
  };

  const statusMap = {
    pending: '待处理',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
  };

  // Fetch order details and items
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        // Fetch order data
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            order_id,
            order_date,
            total_amount,
            status,
            payment_status,
            payment_proof_image,
            user_id,
            users!inner(username)
          `)
          .eq('order_id', orderId)
          .single();

        if (orderError) throw orderError;

        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            order_item_id,
            product_id,
            quantity,
            price,
            products!inner(product_name)
          `)
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        setOrder(orderData);
        setItems(itemsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order details:', error.message || error);
        Alert.alert('错误', '无法加载订单信息');
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Approve payment
  const handleApprovePayment = async () => {
    Alert.alert(
      '确认批準',
      '确定要批準此付款吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid' })
                .eq('order_id', orderId);

              if (error) throw error;

              setOrder(prev => ({ ...prev, payment_status: 'paid' }));
              Alert.alert('成功', '付款已批準');
            } catch (error) {
              console.error('Error approving payment:', error.message || error);
              Alert.alert('错误', '批準付款失败');
            }
          },
        },
      ]
    );
  };

  // Reject payment
  const handleRejectPayment = async () => {
    Alert.alert(
      '确认拒絕',
      '确定要拒絕此付款吗？付款证明将被删除，用户需要重新上传。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              // Delete payment proof image from storage
              if (order.payment_proof_image) {
                const fileName = order.payment_proof_image.split('/').pop();
                const { error: storageError } = await supabase.storage
                  .from('image')
                  .remove([fileName]);

                if (storageError) throw storageError;
              }

              // Update order
              const { error } = await supabase
                .from('orders')
                .update({ payment_status: null, payment_proof_image: null })
                .eq('order_id', orderId);

              if (error) throw error;

              setOrder(prev => ({ ...prev, payment_status: null, payment_proof_image: null }));
              Alert.alert('成功', '付款已被拒絕，用户需重新上传证明');
            } catch (error) {
              console.error('Error rejecting payment:', error.message || error);
              Alert.alert('错误', '拒絕付款失败');
            }
          },
        },
      ]
    );
  };

  // Ship order
  const handleShipOrder = async () => {
    Alert.alert(
      '确认发货',
      '确定要为此订单发货吗？此操作将扣除库存并通知客户。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              // Fetch current stock
              const productIds = items.map(item => item.product_id);
              const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('product_id, stock')
                .in('product_id', productIds);

              if (productsError) throw productsError;

              // Check inventory
              let insufficientStock = [];
              for (const item of items) {
                const product = productsData.find(p => p.product_id === item.product_id);
                if (product.stock < item.quantity) {
                  insufficientStock.push(`${item.products.product_name} (需要 ${item.quantity}, 库存 ${product.stock})`);
                }
              }

              if (insufficientStock.length > 0) {
                Alert.alert(
                  '库存不足',
                  `以下商品库存不足，请补货后再发货：\n${insufficientStock.join('\n')}`
                );
                return;
              }

              // Deduct stock using RPC
              for (const item of items) {
                const { error: rpcError } = await supabase
                  .rpc('decrement_stock', { p_product_id: item.product_id, amount: item.quantity });

                if (rpcError) throw rpcError;
              }

              // Update order status
              const { error: orderError } = await supabase
                .from('orders')
                .update({ status: 'shipped' })
                .eq('order_id', orderId);

              if (orderError) throw orderError;

              // Send notification message to chat
              const email = await AsyncStorage.getItem('isLoggedIn');
              if (!email) throw new Error('Admin not logged in');

              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('user_id')
                .eq('email', email)
                .eq('role', 'admin')
                .single();

              if (userError || !userData) throw new Error('Admin user not found');

              const { error: messageError } = await supabase
                .from('order_messages')
                .insert({
                  order_id: orderId,
                  user_id: userData.user_id,
                  message_text: `您的訂單 #${orderId} 已發貨，請注意查收！`,
                  is_sales: true,
                });

              if (messageError) throw messageError;

              // Update state
              setOrder(prev => ({ ...prev, status: 'shipped' }));
              Alert.alert('成功', '订单已发货，库存已扣除，客户已收到通知');
            } catch (error) {
              console.error('Error shipping order:', error.message || error);
              Alert.alert('错误', `发货失败: ${error.message || '请稍后重试'}`);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2CB696" />
        <Text style={styles.loadingText}>加载中...</Text>
        <AdminBar navigation={navigation} activeScreen="SalesHome" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>订单不存在</Text>
        <AdminBar navigation={navigation} activeScreen="SalesHome" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>订单 #{order.order_id}</Text>
        <View style={styles.orderCard}>
          <Text style={styles.detailText}>客户: {order.users.username}</Text>
          <Text style={styles.detailText}>订单日期: {new Date(order.order_date).toLocaleString('zh-CN')}</Text>
          <Text style={styles.detailText}>总金额: ${order.total_amount.toFixed(2)}</Text>
          <Text style={styles.detailText}>订单状态: {statusMap[order.status]}</Text>
          <Text style={styles.detailText}>付款状态: {paymentStatusMap[order.payment_status] || order.payment_status}</Text>
        </View>

        <Text style={styles.sectionTitle}>订购商品</Text>
        {items.map(item => (
          <View key={item.order_item_id} style={styles.itemCard}>
            <Text style={styles.itemText}>商品: {item.products.product_name}</Text>
            <Text style={styles.itemText}>数量: {item.quantity}</Text>
            <Text style={styles.itemText}>单价: ${item.price.toFixed(2)}</Text>
            <Text style={styles.itemText}>小计: ${(item.quantity * item.price).toFixed(2)}</Text>
          </View>
        ))}

        {order.payment_status === 'pending_review' && order.payment_proof_image && (
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>付款证明</Text>
            <Image source={{ uri: order.payment_proof_image }} style={styles.paymentImage} />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.approveButton} onPress={handleApprovePayment}>
                <Text style={styles.buttonText}>批準</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton} onPress={handleRejectPayment}>
                <Text style={styles.buttonText}>拒絕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {order.payment_status === 'paid' && order.status === 'pending' && (
          <TouchableOpacity style={styles.shipButton} onPress={handleShipOrder}>
            <Text style={styles.buttonText}>发货</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('OrderChat', { orderId })}
        >
          <Text style={styles.buttonText}>进入聊天室</Text>
        </TouchableOpacity>
      </ScrollView>
      <AdminBar navigation={navigation} activeScreen="SalesHome" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    marginVertical: 12,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentSection: {
    marginVertical: 16,
  },
  paymentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  shipButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  chatButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

export default HandleOrder;
