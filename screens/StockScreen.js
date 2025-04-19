import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from './supabaseClient';
import AdminBar from './AdminBar';
import SalesHeader from './SalesHeader';

const StockScreen = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('category_id, category_name');
      if (error) {
        console.error('Error fetching categories:', error);
        Alert.alert('錯誤', '無法加載分類，請稍後重試');
      } else {
        setCategories([{ category_id: 'all', category_name: '全部' }, ...data]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products based on category
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('products')
      .select('product_id, product_name, stock, image_data, category_id, description');

    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching products:', error);
      Alert.alert('錯誤', '無法加載產品，請稍後重試');
    } else {
      console.log('Fetched products:', data);
      setProducts([...(data || [])]); // Deep copy
      setRefreshKey((prev) => prev + 1);
    }
    setIsLoading(false);
  }, [selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle updated product from ProductInfo
  useEffect(() => {
    if (route.params?.updatedProduct) {
      console.log('Received updated product:', route.params.updatedProduct);
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === route.params.updatedProduct.product_id
            ? { ...route.params.updatedProduct }
            : { ...p }
        )
      );
      setRefreshKey((prev) => prev + 1);
      // Reset to 'all' to ensure visibility
      setSelectedCategory('all');
    }
  }, [route.params?.updatedProduct]);

  // Set up real-time subscription for product updates
  useEffect(() => {
    const subscription = supabase
      .channel('products')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Real-time update received:', payload);
          setProducts((prev) =>
            prev.map((p) =>
              p.product_id === payload.new.product_id ? { ...payload.new } : { ...p }
            )
          );
          setRefreshKey((prev) => prev + 1);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIPTION_ERROR') {
          Alert.alert('錯誤', '無法建立實時連接，請檢查網絡');
          fetchProducts();
        }
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [fetchProducts]);

  // Refresh products when screen regains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('StockScreen focused, refreshing products');
      fetchProducts();
    });

    return unsubscribe;
  }, [navigation, fetchProducts]);

  // Filter products based on search query
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('Filtered products:', filtered);
    setFilteredProducts(filtered);
  }, [searchQuery, products, refreshKey]);

  // Handle restock action
  const handleRestock = (product) => {
    setSelectedProduct(product);
    setRestockQuantity('');
    setModalVisible(true);
  };

  // Handle restock confirmation
  const confirmRestock = async () => {
    if (!selectedProduct) return;

    const quantity = parseInt(restockQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('錯誤', '請輸入有效的正整數');
      return;
    }

    try {
      const newStock = selectedProduct.stock + quantity;
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('product_id', selectedProduct.product_id);
      if (error) throw error;

      setModalVisible(false);
      Alert.alert('成功', '庫存已更新');
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('錯誤', '無法更新庫存，請稍後重試');
    }
  };

  // Handle edit action
  const handleEdit = (product) => {
    navigation.navigate('ProductInfo', { product });
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
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.restockButton}
          onPress={() => handleRestock(item)}
        >
          <Text style={styles.restockButtonText}>補貨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.editButtonText}>編輯</Text>
        </TouchableOpacity>
      </View>
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
          extraData={refreshKey}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>未找到產品</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Restock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              補貨: {selectedProduct?.product_name || ''}
            </Text>
            <Text style={styles.modalSubtitle}>
              當前庫存: {selectedProduct?.stock || 0}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={restockQuantity}
              onChangeText={setRestockQuantity}
              placeholder="輸入補貨數量"
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmRestock}
              >
                <Text style={styles.modalButtonText}>確認</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restockButton: {
    backgroundColor: '#003366',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  restockButtonText: {
    color: 'white',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: '#ff9900',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: '100%',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalConfirmButton: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StockScreen;