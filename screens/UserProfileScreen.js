import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import CustBar from './CustBar';
import AdminBar from './AdminBar';

const UserProfileScreen = ({ navigation }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email) {
          navigation.replace('Login');
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('user_id, username, email, role, created_at')
          .eq('email', email)
          .single();

        if (error) throw error;
        if (data) {
          setUserInfo(data);
          setIsAdmin(data.role === 'admin');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigation]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('loginRole');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2CB696" />
        {isAdmin ? (
          <AdminBar navigation={navigation} activeScreen="SalesHome" />
        ) : (
          <CustBar navigation={navigation} activeScreen="UserProfile" />
        )}
      </SafeAreaView>
    );
  }

  if (!userInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No user data found.</Text>
        {isAdmin ? (
          <AdminBar navigation={navigation} activeScreen="SalesHome" />
        ) : (
          <CustBar navigation={navigation} activeScreen="UserProfile" />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileHeader}>
          <Icon name="account-circle" size={80} color="#2CB696" />
          <Text style={styles.username}>{userInfo.username}</Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{userInfo.user_id}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userInfo.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Member Since:</Text>
            <Text style={styles.infoValue}>
              {new Date(userInfo.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.iconButtonContainer}>
          <View style={styles.iconButtonWrapper}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate(isAdmin ? 'SalesHome' : 'Footprint')}
            >
              <Icon name={isAdmin ? 'receipt' : 'history'} size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.iconButtonLabel}>{isAdmin ? '訂單管理' : '足跡'}</Text>
          </View>

          <View style={styles.iconButtonWrapper}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate(isAdmin ? 'Inventory' : 'PurchaseHistory')}
            >
              <Icon name={isAdmin ? 'archive' : 'shopping-cart'} size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.iconButtonLabel}>{isAdmin ? '庫存' : '購買紀錄'}</Text>
          </View>

          <View style={styles.iconButtonWrapper}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate(isAdmin ? 'SalesStatus' : 'Preferences')}
            >
              <Icon name={isAdmin ? 'bar-chart' : 'settings'} size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.iconButtonLabel}>{isAdmin ? '銷售狀況' : '喜好設定'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Text style={styles.buttonText}>Change Password</Text>
          <Icon name="lock-reset" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Log Out</Text>
          <Icon name="logout" size={24} color="white" />
        </TouchableOpacity>
      </ScrollView>
      {isAdmin ? (
        <AdminBar navigation={navigation} activeScreen="SalesHome" />
      ) : (
        <CustBar navigation={navigation} activeScreen="UserProfile" />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80, // Extra padding to avoid overlap with CustBar or AdminBar
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  iconButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconButtonWrapper: {
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: '#2CB696',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButtonLabel: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2CB696',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    gap: 10,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default UserProfileScreen;
