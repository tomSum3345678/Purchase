import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TextInput, Modal } from 'react-native';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminBar from './AdminBar';

const HandleOrder = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState('');

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

  const deliveryStatusMap = {
    null: '未发货',
    delivered: '已送达客户所指定的地址',
  };

  // Fetch order details and items
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
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
            delivery_address_line1,
            delivery_address_line2,
            delivery_street,
            delivery_district,
            delivery_country,
            delivery_status_current_location,
            users!inner(username)
          `)
          .eq('order_id', orderId)
          .single();

        if (orderError) throw orderError;

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
              if (order.payment_proof_image) {
                const fileName = order.payment_proof_image.split('/').pop();
                const { error: storageError } = await supabase.storage
                  .from('image')
                  .remove([fileName]);

                if (storageError) throw storageError;
              }

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
              const productIds = items.map(item => item.product_id);
              const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('product_id, stock')
                .in('product_id', productIds);

              if (productsError) throw productsError;

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

              for (const item of items) {
                const { error: rpcError } = await supabase
                  .rpc('decrement_stock', { p_product_id: item.product_id, amount: item.quantity });

                if (rpcError) throw rpcError;
              }

              const { error: orderError } = await supabase
                .from('orders')
                .update({ status: 'shipped' })
                .eq('order_id', orderId);

              if (orderError) throw orderError;

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
                  message_text: `您的订单 #${orderId} 已发货，请注意查收！`,
                  is_sales: true,
                });

              if (messageError) throw messageError;

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

  // Update delivery location
  const handleUpdateLocation = async () => {
    if (!newLocation.trim()) {
      Alert.alert('错误', '请输入物流位置');
      return;
    }

    try {
      const email = await AsyncStorage.getItem('isLoggedIn');
      if (!email) throw new Error('Admin not logged in');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .eq('role', 'admin')
        .single();

      if (userError || !userData) throw new Error('Admin user not found');

      // Update location in orders table
      const { error: updateError } = await supabase
        .from('orders')
        .update({ delivery_status_current_location: newLocation.trim() })
        .eq('order_id', orderId);

      if (updateError) throw updateError;

      // Send notification to chat
      const { error: messageError } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          user_id: userData.user_id,
          message_text: `您的訂單 #${orderId} 物流位置已更新：${newLocation.trim()}`,
          is_sales: true,
        });

      if (messageError) throw messageError;

      setOrder(prev => ({ ...prev, delivery_status_current_location: newLocation.trim() }));
      setNewLocation('');
      setShowLocationModal(false);
      Alert.alert('成功', '物流位置已更新，客户已收到通知');
    } catch (error) {
      console.error('Error updating location:', error.message || error);
      Alert.alert('错误', '更新物流位置失败');
    }
  };

  // Mark as delivered
  const handleMarkAsDelivered = async () => {
    Alert.alert(
      '確認送達',
      '確定要將此訂單標記為已送達嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          onPress: async () => {
            try {
              const email = await AsyncStorage.getItem('isLoggedIn');
              if (!email) throw new Error('Admin not logged in');

              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('user_id')
                .eq('email', email)
                .eq('role', 'admin')
                .single();

              if (userError || !userData) throw new Error('Admin user not found');

              // Update to delivered status
              const { error: updateError } = await supabase
                .from('orders')
                .update({ delivery_status_current_location: 'delivered' })
                .eq('order_id', orderId);

              if (updateError) throw updateError;

              // Send notification to chat
              const { error: messageError } = await supabase
                .from('order_messages')
                .insert({
                  order_id: orderId,
                  user_id: userData.user_id,
                  message_text: `您的订单 #${orderId} 已送达指定地址，请确认收货！`,
                  is_sales: true,
                });

              if (messageError) throw messageError;

              setOrder(prev => ({ ...prev, delivery_status_current_location: 'delivered' }));
              setShowLocationModal(false);
              Alert.alert('成功', '訂單已標記為已送達，客戶已收到通知');
            } catch (error) {
              console.error('Error marking as delivered:', error.message || error);
              Alert.alert('錯誤', '標記送達失敗');
            }
          },
        },
      ]
    );
  };

  // Check if current location matches delivery address
  const isAtDeliveryAddress = () => {
    if (!order || !newLocation) return false;
    const deliveryAddress = formatDeliveryAddress();
    return newLocation.trim().toLowerCase() === deliveryAddress.toLowerCase();
  };

  // Format delivery address for display
  const formatDeliveryAddress = () => {
    if (!order) return '無送貨地址';
    const { delivery_address_line1, delivery_address_line2, delivery_street, delivery_district, delivery_country } = order;
    let address = `${delivery_address_line1}, ${delivery_street}, ${delivery_district}, ${delivery_country}`;
    if (delivery_address_line2) {
      address = `${delivery_address_line1}, ${delivery_address_line2}, ${delivery_street}, ${delivery_district}, ${delivery_country}`;
    }
    return address;
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
          <Text style={styles.detailText}>送貨地址: {formatDeliveryAddress()}</Text>
          <Text style={styles.detailText}>
            当前物流位置: {deliveryStatusMap[order.delivery_status_current_location] || order.delivery_status_current_location || '未更新'}
          </Text>
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

        {order.status === 'shipped' && order.delivery_status_current_location !== 'delivered' && (
          <TouchableOpacity
            style={styles.updateLocationButton}
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={styles.buttonText}>更新物流位置</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('OrderChat', { orderId })}
        >
          <Text style={styles.buttonText}>进入聊天室</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal for updating location */}
      <Modal visible={showLocationModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>更新物流位置</Text>
            <TextInput
              style={styles.modalInput}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="请输入当前物流位置"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setNewLocation('');
                  setShowLocationModal(false);
                }}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleUpdateLocation}>
                <Text style={styles.buttonText}>确认更新</Text>
              </TouchableOpacity>
              {isAtDeliveryAddress() && (
                <TouchableOpacity style={styles.markDeliveredButton} onPress={handleMarkAsDelivered}>
                  <Text style={styles.buttonText}>標記為已送達</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
  updateLocationButton: {
    backgroundColor: '#4CAF50',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  modalButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  markDeliveredButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    flex: 1,
    marginHorizontal: 4,
  },
});

export default HandleOrder;
