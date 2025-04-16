import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from './supabaseClient'; // Adjust path to your Supabase client
import AdminBar from './AdminBar';
import SalesHeader from './SalesHeader';

const StockScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('category_id, category_name');
      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setCategories([{ category_id: 'all', category_name: '全部' }, ...data]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products based on category
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      let query = supabase.from('products').select('product_id, product_name, stock, image_data, category_id');

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data || []);
      }
      setIsLoading(false);
    };
    fetchProducts();
  }, [selectedCategory]);

  // Filter products based on search query
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // Handle restock action (placeholder)
  const handleRestock = (productId) => {
    console.log(`Restock requested for product ID: ${productId}`);
    // navigation.navigate('RestockForm', { productId });
  };

  // Handle navigation to AddProduct screen
  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const renderProductItem = ({ item }) => (
    <View
      style={[
        styles.productRow,
        item.stock < 5 && styles.lowStockRow,
      ]}
    >
      <Image source={{ uri: item.image_data }} style={styles.productImage} />
      <Text style={styles.productName}>{item.product_name}</Text>
      <Text style={styles.stockLevel}>{item.stock}</Text>
      <TouchableOpacity
        style={styles.restockButton}
        onPress={() => handleRestock(item.product_id)}
      >
        <Text style={styles.restockButtonText}>補貨</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SalesHeader />
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>庫存管理</Text>
      </View>

      {/* Search Bar and Add Product Button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索產品..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Text style={styles.addButtonText}>新增產品</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <View style={styles.filterContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.category_id}
            style={[
              styles.filterButton,
              selectedCategory === category.category_id && styles.activeFilter,
            ]}
            onPress={() => setSelectedCategory(category.category_id)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === category.category_id && styles.activeFilterText,
              ]}
            >
              {category.category_name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003366" />
          <Text style={styles.loadingText}>正在加載...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>未找到產品</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <AdminBar navigation={navigation} activeScreen="Inventory" />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    elevation: 2,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
  activeFilter: {
    backgroundColor: '#003366',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    elevation: 2,
  },
  lowStockRow: {
    backgroundColor: '#ffe6e6',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  stockLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginRight: 10,
  },
  restockButton: {
    backgroundColor: '#003366',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restockButtonText: {
    color: 'white',
    fontSize: 14,
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

export default StockScreen;