import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Header = ({ showSearch = false, searchQuery, setSearchQuery }) => {
  const navigation = useNavigation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loggedInEmail = await AsyncStorage.getItem('isLoggedIn');
        setIsLoggedIn(!!loggedInEmail);
        setEmail(loggedInEmail || '');
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus();
    const unsubscribe = navigation.addListener('focus', checkLoginStatus);
    return unsubscribe;
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

  const handleUserPress = () => {
    if (isLoggedIn) {
      navigation.navigate('UserProfile');
    } else {
      navigation.navigate('Login');
    }
  };



  return (
    <View style={styles.navbar}>
      <Text style={styles.logo}>BargainBazaar</Text>
      
      {showSearch && (
        <View style={styles.searchBar}>
          <Icon name="search" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for anything..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <View style={styles.navIcons}>
        <TouchableOpacity onPress={handleUserPress}>
          <Icon name="user" size={20} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ShoppingCart')}>
          <Icon name="shopping-cart" size={20} style={styles.cartIcon} />
        </TouchableOpacity>

        {isLoggedIn && (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    width: '100%',
    zIndex: 100,
  },
  logo: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#2CB696',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
  },
  navIcons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  cartIcon: {
    marginLeft: 8,
  },
  logoutButton: {
    marginLeft: 8,
  },
});

export default Header;