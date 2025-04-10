import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  View,
  Image, // Added Image component
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OrderDetails = ({ navigation, route }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
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
          .select('user_id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || 'User not found');
        }
        const userId = userData.user_id;

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('order_id', orderId)
          .eq('user_id', userId)
          .single();

        if (orderError || !orderData) {
          throw new Error(orderError?.message || 'Order not found');
        }

        // Fetch order items with product details including image_data
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, quantity, price, products(product_name, image_data)') // Added image_data
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        const cartItems = itemsData.map((item) => ({
          product_id: item.product_id,
          product_name: item.products.product_name,
          quantity: item.quantity,
          price: item.price,
          image_data: item.products.image_data, // Added image_data
        }));

        setOrderDetails({
          orderId: orderData.order_id,
          cartItems,
          total: orderData.total_amount,
          address: {
            line1: orderData.delivery_address_line1,
            line2: orderData.delivery_address_line2,
            district: orderData.delivery_district,
            street: orderData.delivery_street,
            country: orderData.delivery_country,
          },
          paymentMethod: orderData.payment_method || '未指定',
          orderDate: new Date(orderData.order_date).toLocaleString(),
          paymentStatus: orderData.payment_status,
          status: orderData.status,
          deliveryStatus: orderData.delivery_status_current_location,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order details:', error.message || error);
        Alert.alert('错误', '无法加载订单详情');
        navigation.goBack();
      }
    };

    fetchOrderDetails();
  }, [navigation, route]);

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      {/* Added Image component */}
      <Image
        source={{ uri: item.image_data }}
        style={styles.itemImage}
        resizeMode="cover"
        onError={() => console.log(`Failed to load image for ${item.product_name}`)}
      />
      <View style={styles.itemTextContainer}>
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
        <Text style={styles.loadingText}>加载订单详情...</Text>
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
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>订单详情</Text>
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
            <Text style={styles.detailText}>{orderDetails.paymentMethod}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>付款状态</Text>
            <Text style={styles.detailText}>
              {orderDetails.paymentStatus === null ? '未付款' : orderDetails.paymentStatus}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>订单状态</Text>
            <Text style={styles.detailText}>{orderDetails.status}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>配送状态</Text>
            <Text style={styles.detailText}>
              {orderDetails.deliveryStatus === null ? '未发货' : orderDetails.deliveryStatus}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>订单日期</Text>
            <Text style={styles.detailText}>{orderDetails.orderDate}</Text>
          </View>
        </View>
      }
      ListFooterComponent={
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>返回</Text>
        </TouchableOpacity>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 20,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
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
    flexDirection: 'row', // Align image and text horizontally
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  itemImage: {
    width: 60, // Adjust size as needed
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  itemTextContainer: {
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
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
  },
  backButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OrderDetails;