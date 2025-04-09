// screens/CheckoutConfirmation.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CheckoutConfirmation = ({ navigation, route }) => {
  const [step, setStep] = useState(1); // Step 1: Review Items, Step 2: Address, Step 3: Payment Method
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Hong Kong', // Default as per your schema
  });
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    const { cartItems: passedCartItems, total: passedTotal } = route.params || { cartItems: [], total: 0 };

    if (passedCartItems && passedCartItems.length > 0) {
      setCartItems(passedCartItems);
      setTotal(passedTotal);
    } else {
      const checkLoginStatus = async () => {
        try {
          const value = await AsyncStorage.getItem('isLoggedIn');
          if (value) {
            setEmail(value);
            fetchCartItems(value);
          } else {
            Alert.alert('错误', '请先登录');
            navigation.navigate('Login');
          }
        } catch (error) {
          console.error('Error checking login status:', error);
        }
      };
      checkLoginStatus();
    }
  }, [navigation, route]);

  const fetchCartItems = async (email) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error(userError?.message || 'User not found');
      }

      const { data: cartData, error: cartError } = await supabase
        .from('shopping_cart')
        .select('id, product_id, quantity')
        .eq('user_id', userData.user_id);

      if (cartError) throw cartError;
      if (!cartData?.length) {
        setCartItems([]);
        setTotal(0);
        return;
      }

      const productIds = cartData.map((item) => item.product_id);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('product_id, product_name, price, image_data') // Explicitly include image_data
        .in('product_id', productIds);

      if (productsError) throw productsError;

      const mergedData = cartData.map((cartItem) => ({
        cartId: cartItem.id,
        ...productsData.find((p) => p.product_id === cartItem.product_id),
        quantity: cartItem.quantity,
      }));

      setCartItems(mergedData);
      calculateTotal(mergedData);
    } catch (error) {
      console.error('Error fetching cart items:', error.message || error);
      Alert.alert('错误', '无法获取购物车数据');
    }
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(total.toFixed(2));
  };

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

  const handleNextStep = () => {
    if (step === 1) {
      if (cartItems.length === 0) {
        Alert.alert('错误', '购物车为空，无法继续');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!address.line1 || !address.city || !address.state || !address.postalCode) {
        Alert.alert('错误', '请填写所有必填地址字段');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!paymentMethod) {
        Alert.alert('错误', '请选择付款方式');
        return;
      }
      Alert.alert(
        '确认',
        `总金额: $${total}\n送货地址: ${address.line1}, ${address.city}, ${address.state}, ${address.postalCode}, ${address.country}\n付款方式: ${paymentMethod}`,
        [
          { text: '取消', style: 'cancel' },
          { text: '确定', onPress: () => navigation.navigate('OrderCreation', { cartItems, total, address, paymentMethod }) },
        ]
      );
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: // Review Items
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>确认购买商品</Text>
            <FlatList
              data={cartItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.product_id.toString()}
              contentContainerStyle={styles.list}
            />
            <Text style={styles.total}>总金额: ${total}</Text>
          </View>
        );
      case 2: // Delivery Address
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>填写送货地址</Text>
            <TextInput
              style={styles.input}
              placeholder="地址第一行 *"
              value={address.line1}
              onChangeText={(text) => setAddress({ ...address, line1: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="地址第二行（可选）"
              value={address.line2}
              onChangeText={(text) => setAddress({ ...address, line2: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="城市 *"
              value={address.city}
              onChangeText={(text) => setAddress({ ...address, city: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="州/省 *"
              value={address.state}
              onChangeText={(text) => setAddress({ ...address, state: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="邮政编码 *"
              value={address.postalCode}
              onChangeText={(text) => setAddress({ ...address, postalCode: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="国家"
              value={address.country}
              editable={false}
            />
          </View>
        );
      case 3: // Payment Method
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>选择付款方式</Text>
            <TouchableOpacity
              style={[styles.optionButton, paymentMethod === 'Credit Card' && styles.selectedOption]}
              onPress={() => setPaymentMethod('Credit Card')}
            >
              <Text style={styles.optionText}>信用卡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, paymentMethod === 'PayPal' && styles.selectedOption]}
              onPress={() => setPaymentMethod('PayPal')}
            >
              <Text style={styles.optionText}>PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, paymentMethod === 'Cash on Delivery' && styles.selectedOption]}
              onPress={() => setPaymentMethod('Cash on Delivery')}
            >
              <Text style={styles.optionText}>货到付款</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepIndicator}>
        <Text style={[styles.stepText, step === 1 && styles.activeStep]}>1. 确认商品</Text>
        <Text style={[styles.stepText, step === 2 && styles.activeStep]}>2. 送货地址</Text>
        <Text style={[styles.stepText, step === 3 && styles.activeStep]}>3. 付款方式</Text>
      </View>
      {renderStepContent()}
      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.buttonText}>上一步</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
          <Text style={styles.buttonText}>{step === 3 ? '确认订单' : '下一步'}</Text>
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  activeStep: {
    color: '#2CB696',
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  itemCard: {
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
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    borderColor: '#2CB696',
    backgroundColor: '#e6f5f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButton: {
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
});

export default CheckoutConfirmation;