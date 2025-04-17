import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import CustBar from './CustBar';

const Footprint = ({ navigation }) => {
  const [viewHistory, setViewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchViewHistory = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email) {
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw userError || new Error('User not found');
        }

        setUserId(userData.user_id);

        const { data, error } = await supabase
          .from('view_history')
          .select(`
            view_id,
            product_id,
            viewed_at,
            products (
              product_id,
              product_name,
              image_data,
              description,
              price,
              stock,
              category_id,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', userData.user_id)
          .order('viewed_at', { ascending: false });

        if (error) throw error;

        setViewHistory(data || []);
      } catch (error) {
        console.error('Error fetching view history:', error.message || error);
      } finally {
        setLoading(false);
      }
    };

    fetchViewHistory();
  }, []);

  const handleViewProduct = (product) => {
    navigation.navigate('Product Detail', { product });
  };

  const renderViewItem = ({ item }) => (
    <View style={styles.historyItem}>
      <Image
        source={{ uri: item.products.image_data }}
        style={styles.productImage}
        resizeMode="contain"
      />
      <View style={styles.itemDetails}>
        <Text style={styles.productName}>{item.products.product_name}</Text>
        <Text style={styles.viewedAt}>
          Viewed: {new Date(item.viewed_at).toLocaleString()}
        </Text>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewProduct(item.products)}
        >
          <Text style={styles.buttonText}>查看产品</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2CB696" />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>Please log in to view your browsing history.</Text>
        <CustBar navigation={navigation} activeScreen="Footprint" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>瀏覽紀錄</Text>
      {viewHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No browsing history found.</Text>
        </View>
      ) : (
        <FlatList
          data={viewHistory}
          renderItem={renderViewItem}
          keyExtractor={(item) => item.view_id.toString()}
          contentContainerStyle={styles.historyList}
        />
      )}
      <CustBar navigation={navigation} activeScreen="Footprint" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  historyList: {
    paddingBottom: 80, // Extra padding to avoid overlap with CustBar
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  viewedAt: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  viewButton: {
    backgroundColor: '#2CB696',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Footprint;