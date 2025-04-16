// screens/MainPage.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import CustBar from './CustBar'; // Import the new CustBar component

const { width } = Dimensions.get('window'); // 获取屏幕宽度，用于判断设备类型

const MainPage = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [email, setEmail] = useState('');

  // 判断是否为网页（大屏）还是手机（小屏）
  const isSmallScreen = width < 768; // 小于 768px 视为手机

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('isLoggedIn');
        if (value != null) {
          setEmail(value);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus();
  }, [navigation]);

  const categories = [
    { id: 'All', name: '全部' },
    { id: 1, name: '武侠' },
    { id: 2, name: '烹饪' },
    { id: 3, name: '编程' },
    { id: 4, name: '历史' },
    { id: 5, name: '自传' },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let query = supabase.from('products').select('*');

        if (selectedCategory !== 'All') {
          query = query.eq('category_id', selectedCategory);
        }

        const { data, error } = await query;

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  useEffect(() => {
    const filtered = products.filter((product) =>
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={isSmallScreen ? styles.productCardMobile : styles.productCardWeb}
      onPress={() => navigation.navigate('Product Detail', { product: item })}
    >
      <View>
        <Image source={{ uri: item.image_data }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productPrice}>${item.price}</Text>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.product_name}
          </Text>
          <Text style={styles.productTime}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.logo}>SSW BookHub</Text>
        <View
          style={isSmallScreen ? styles.searchBarMobile : styles.searchBarWeb}
        >
          <Icon name="search" size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder=""
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.navIcons}>
          <TouchableOpacity
            style={{ marginLeft: 10 }}
            onPress={async () => {
              try {
                await AsyncStorage.removeItem('isLoggedIn');
                await AsyncStorage.removeItem('loginRole');
                navigation.replace('Login');
              } catch (error) {
                console.error('Error during logout:', error);
              }
            }}
          >
            <MaterialIcons name="logout" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile')}>
            <Icon name="user" size={16} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ShoppingCart')}>
            <Icon name="shopping-cart" size={16} style={styles.cartIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        horizontal
        showsHorizontalScrollIndicator={false}
        style={isSmallScreen ? styles.categoriesMobile : styles.categoriesWeb}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.category,
              selectedCategory === category.id && styles.activeCategory,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id.toString()}
          numColumns={isSmallScreen ? 2 : 4} // 手机两列，网页四列
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productGrid}
        />
      </View>

      <CustBar navigation={navigation} activeScreen="HomePage" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    elevation: 2,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 100,
    height: 60, // 统一导航栏高度
  },
  logo: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#2CB696',
  },
  searchBarWeb: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  searchBarMobile: {
    flex: 1,
    flexDirection: 'row',
    padding: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  navIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesWeb: {
    flexDirection: 'row',
    padding: 16,
    marginTop: 60,
    backgroundColor: '#fff',
    maxHeight: 75,
  },
  categoriesMobile: {
    flexDirection: 'row',
    padding: 8,
    marginTop: 60,
    backgroundColor: '#fff',
    maxHeight: 50,
  },
  category: {
    padding: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
    marginRight: 6,
  },
  activeCategory: {
    backgroundColor: '#2CB696',
    color: '#fff',
    borderColor: '#2CB696',
  },
  categoryText: {
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
    marginBottom: 60, // Leave space for the bottom bar
  },
  productGrid: {
    padding: 8,
  },
  productCardWeb: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    marginRight: 8,
    width: width / 4.5, // 网页四列
    elevation: 2,
  },
  productCardMobile: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    marginRight: 8,
    width: width / 2.2, // 手机两列
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
  },
  productInfo: {
    padding: 8,
  },
  productPrice: {
    fontWeight: 'bold',
    color: '#2CB696',
    marginBottom: 4,
    fontSize: 14,
  },
  productTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  productTime: {
    fontSize: 10,
    color: '#666',
  },
  cartIcon: {
    marginLeft: 8,
  },
});

export default MainPage;