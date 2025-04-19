import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const CustomerInfo = ({ navigation, route }) => {
  const { user } = route.params;
  const [customerDetails, setCustomerDetails] = useState(null);
  const [purchasedBooks, setPurchasedBooks] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        const role = await AsyncStorage.getItem('loginRole');
        if (!email || !role || role !== 'admin') {
          Alert.alert('無權限', '僅管理員可訪問');
          navigation.navigate('Login');
          return;
        }
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();
        if (error || !userData || userData.role !== 'admin') {
          Alert.alert('無權限', '僅管理員可訪問');
          navigation.navigate('Login');
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        Alert.alert('錯誤', '無法驗證權限，請重新登錄');
        navigation.navigate('Login');
      }
    };
    checkAdmin();
  }, [navigation]);

  // Fetch customer details, purchased books, and total spent
  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, username, email')
        .eq('user_id', user.user_id)
        .single();
      if (userError) throw userError;

      // Fetch total spent from completed orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('user_id', user.user_id)
        .eq('status', 'completed');
      if (ordersError) throw ordersError;
      const total = ordersData.reduce((sum, order) => sum + order.total_amount, 0);

      // Fetch purchased books from completed orders
      const { data: purchasedData, error: purchasedError } = await supabase
        .from('orders')
        .select(`
          order_id,
          order_items (
            product_id,
            quantity,
            products (
              product_name,
              image_data
            )
          )
        `)
        .eq('user_id', user.user_id)
        .eq('status', 'completed');
      if (purchasedError) throw purchasedError;

      // Process purchased books
      const books = purchasedData
        .flatMap((order) => order.order_items)
        .map((item) => ({
          product_id: item.product_id,
          product_name: item.products.product_name,
          quantity: item.quantity,
          image_data: item.products.image_data,
        }));

      console.log('Customer details:', userData);
      console.log('Total spent:', total);
      console.log('Purchased books:', books);

      setCustomerDetails(userData);
      setTotalSpent(total);
      setPurchasedBooks(books);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      Alert.alert('錯誤', '無法加載客戶詳情，請稍後重試');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [user.user_id]);

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  const renderBookItem = (book) => (
    <View style={styles.bookRow} key={book.product_id}>
      <Image source={{ uri: book.image_data }} style={styles.bookImage} />
      <View style={styles.bookDetails}>
        <Text style={styles.bookName}>{book.product_name}</Text>
        <Text style={styles.bookQuantity}>數量: {book.quantity}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>客戶詳情</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003366" />
          <Text style={styles.loadingText}>正在加載...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {customerDetails && (
            <View style={styles.infoContainer}>
              <Text style={styles.label}>用戶名</Text>
              <Text style={styles.infoText}>{customerDetails.username}</Text>

              <Text style={styles.label}>電郵</Text>
              <Text style={styles.infoText}>{customerDetails.email}</Text>

              <Text style={styles.label}>總消費金額</Text>
              <Text style={styles.infoText}>HK${totalSpent.toFixed(2)}</Text>

              <Text style={styles.label}>購買書籍</Text>
              {purchasedBooks.length > 0 ? (
                purchasedBooks.map(renderBookItem)
              ) : (
                <Text style={styles.emptyText}>尚未購買任何書籍</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>返回</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e1e1ee',
  },
  header: {
    backgroundColor: '#003366',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  infoContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  bookRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    elevation: 2,
  },
  bookImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 10,
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  bookName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bookQuantity: {
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
});

export default CustomerInfo;