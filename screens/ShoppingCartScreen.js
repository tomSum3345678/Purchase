import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Supabase configuration
const supabaseUrl = 'https://zppoywoaiktzsinnxcco.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcG95d29haWt0enNpbm54Y2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgyMjc2MTYsImV4cCI6MjA0MzgwMzYxNn0.SEYkSE1oJ3YL9ReDQCG48tCvI0Aur-3NgfPmGr0zIRg';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ShoppingCart = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('isLoggedIn');
        if (value) {
          setEmail(value);
          fetchCartItems(value);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus();
  }, []);

  const fetchCartItems = async (email) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single();
  
      if (userError || !userData) {
        console.error('Error fetching user:', userError?.message || 'User not found');
        return;
      }
  
      // Fetch shopping cart items
      const { data: cartData, error: cartError } = await supabase
        .from('shopping_cart')
        .select('id, product_id, quantity')
        .eq('user_id', userData.user_id);
  
      if (cartError) throw cartError;
  
      if (!cartData?.length) {
        setCartItems([]);
        return;
      }
  
      // Extract product IDs
      const productIds = cartData.map(item => item.product_id);
  
      // Fetch related products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('product_id', productIds);
  
      if (productsError) throw productsError;
  
      // Merge data
      const mergedData = cartData.map(cartItem => ({
        cartId: cartItem.id,
        ...productsData.find(p => p.product_id === cartItem.product_id),
        quantity: cartItem.quantity
      }));
  
      setCartItems(mergedData);
      calculateTotal(mergedData);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      Alert.alert('错误', '无法获取购物车数据');
    }
  };


  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(total.toFixed(2));
  };

  const updateQuantity = async (cartId, newQuantity) => {
    try {
      if (newQuantity < 1) {
        await supabase.from('shopping_cart').delete().eq('id', cartId);
      } else {
        await supabase.from('shopping_cart').update({ quantity: newQuantity }).eq('id', cartId);
      }
      fetchCartItems(email);
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('错误', '更新数量失败');
    }
  };

  const handleCheckout = async () => {
    Alert.alert('结算', `总金额：$${total}`);
    // Add checkout logic here
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image_data }} style={styles.image} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.product_name}</Text>
        <Text style={styles.price}>单价：${item.price}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => updateQuantity(item.cartId, item.quantity - 1)}>
            <Icon name="remove-circle" size={24} color="#2CB696" />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.cartId, item.quantity + 1)}>
            <Icon name="add-circle" size={24} color="#2CB696" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtotal}>小计：${(item.price * item.quantity).toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => updateQuantity(item.cartId, 0)}>
        <Icon name="delete" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="remove-shopping-cart" size={80} color="#ccc" />
          <Text style={styles.emptyText}>您的购物车是空的</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.product_id.toString()}
            contentContainerStyle={styles.list}
          />
          <View style={styles.summary}>
            <Text style={styles.total}>总金额：${total}</Text>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>去结算</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  subtotal: {
    fontSize: 14,
    color: '#2CB696',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  summary: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
});

export default ShoppingCart;