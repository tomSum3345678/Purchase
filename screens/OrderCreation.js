import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OrderCreation = ({ navigation, route }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const createOrder = async () => {
      try {
        const { cartItems, total, address, paymentMethod } = route.params || {};
        if (!cartItems || !total || !address || !paymentMethod) {
          throw new Error('Missing order details');
        }

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

        // Insert into orders table
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            total_amount: parseFloat(total),
            status: 'pending',
            delivery_address_line1: address.line1,
            delivery_address_line2: address.line2 || null,
            delivery_district: address.district,
            delivery_street: address.street,
            delivery_country: address.country || 'Hong Kong',
            payment_status: null,
            payment_method: paymentMethod,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderId = orderData.order_id;

        const orderItems = cartItems.map((item) => ({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        const { error: cartError } = await supabase
          .from('shopping_cart')
          .delete()
          .eq('user_id', userId);

        if (cartError) throw cartError;

        // Fetch product images
        const productIds = cartItems.map((item) => item.product_id);
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('product_id, image_data')
          .in('product_id', productIds);

        if (productsError) throw productsError;

        const updatedCartItems = cartItems.map((item) => {
          const product = productsData.find((p) => p.product_id === item.product_id);
          return {
            ...item,
            image_data: product ? product.image_data : null,
          };
        });

        setOrderDetails({
          orderId,
          cartItems: updatedCartItems,
          total,
          address,
          paymentMethod,
          orderDate: new Date().toLocaleString(),
          paymentStatus: orderData.payment_status,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error creating order:', error.message || error);
        Alert.alert('错误', '订单创建失败，请重试');
        navigation.goBack();
      }
    };

    createOrder();
  }, [navigation, route]);

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      {item.image_data ? (
        <Image source={{ uri: item.image_data }} style={styles.itemImage} />
      ) : (
        <Text style={styles.noImageText}>无图片</Text>
      )}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product_name}</Text>
        <Text style={styles.itemDetail}>数量: {item.quantity}</Text>
        <Text style={styles.itemDetail}>单价: ${item.price}</Text>
        <Text style={styles.itemSubtotal}>小计: ${(item.price * item.quantity).toFixed(2)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>正在创建订单...</Text>
      </View>
    );
  }

  if (!orderDetails) return null;

  return (
    <FlatList
      data={orderDetails.cartItems}
      renderItem={renderItem}
      keyExtractor={(item) => item.product_id.toString()}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <Icon name="check-circle" size={40} color="#2CB696" />
            <Text style={styles.successTitle}>订单创建成功！</Text>
            <Text style={styles.orderId}>订单编号: #{orderDetails.orderId}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>送货地址</Text>
            <Text style={styles.addressText}>{orderDetails.address.line1}</Text>
            {orderDetails.address.line2 && (
              <Text style={styles.addressText}>{orderDetails.address.line2}</Text>
            )}
            <Text style={styles.addressText}>
              {orderDetails.address.street}, {orderDetails.address.district}
            </Text>
            <Text style={styles.addressText}>{orderDetails.address.country}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>付款方式</Text>
            <Text style={styles.detailText}>
              {orderDetails.paymentMethod === 'WeChat' ? '微信支付' : orderDetails.paymentMethod}
            </Text>
            <Text style={styles.detailText}>
              请稍后上传付款证明图片以完成订单。
            </Text>
          </View>
        </>
      }
      ListFooterComponent={
        <>
          <Text style={styles.total}>总金额: ${orderDetails.total}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigation.navigate('HomePage')}
            >
              <Text style={styles.buttonText}>返回首页</Text>
            </TouchableOpacity>
          </View>
        </>
      }
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2CB696',
    marginTop: 10,
  },
  orderId: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 14,
    color: '#2CB696',
    fontWeight: '500',
    marginTop: 4,
  },
  noImageText: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  homeButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});

export default OrderCreation;