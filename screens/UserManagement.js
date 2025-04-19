import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import AdminBar from './AdminBar';
import SalesHeader from './SalesHeader';

const UserManagement = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
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

  // Fetch customers
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, username, email')
        .eq('role', 'user');
      if (error) throw error;
      console.log('Fetched users:', data);
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('錯誤', '無法加載客戶資料，請稍後重試');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Real-time subscription for users
  useEffect(() => {
    const subscription = supabase
      .channel('users')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: "role=eq.user" },
        (payload) => {
          console.log('Real-time user update:', payload);
          setUsers((prev) =>
            prev.map((u) =>
              u.user_id === payload.new.user_id ? { ...payload.new } : u
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('User subscription status:', status);
        if (status === 'SUBSCRIPTION_ERROR') {
          Alert.alert('錯誤', '無法建立實時連接，請檢查網絡');
          fetchUsers();
        }
      });

    return () => {
      console.log('Cleaning up user subscription');
      supabase.removeChannel(subscription);
    };
  }, []);

  // Filter users based on search query
  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('Filtered users:', filtered);
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Handle view details
  const handleViewDetails = (user) => {
    navigation.navigate('CustomerInfo', { user });
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userRow}>
      <Text style={styles.username}>{item.username}</Text>
      <Text style={styles.email}>{item.email}</Text>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => handleViewDetails(item)}
      >
        <Text style={styles.buttonText}>查看詳情</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SalesHeader />
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>客戶管理</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索客戶（用戶名或電郵）..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* User List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003366" />
          <Text style={styles.loadingText}>正在加載...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.user_id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>未找到客戶</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <AdminBar navigation={navigation} activeScreen="UserManagement" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e1e1ee',
  },
  navbar: {
    backgroundColor: '#003366',
    padding: 15,
    alignItems: 'center',
  },
  navTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    elevation: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    elevation: 2,
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  email: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  detailsButton: {
    backgroundColor: '#003366',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
});

export default UserManagement;