import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Header from './Header';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustBar from './CustBar';

const ProductDetail = ({ route, navigation }) => {
  const { product } = route.params;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Hard-coded comments data
  const [comments] = useState([
    { id: 1, user: 'User1', comment: 'Great product! Highly recommended.', date: '2023-10-01' },
    { id: 2, user: 'User2', comment: 'Good quality, but delivery was slow.', date: '2023-10-05' },
    { id: 3, user: 'User3', comment: 'Excellent value for money.', date: '2023-10-10' },
  ]);

  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  // Log view history when component mounts
  useEffect(() => {
    const logViewHistory = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('isLoggedIn');
        if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
          console.log('No user logged in, skipping view history log');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', userEmail)
          .single();

        if (userError || !userData?.user_id) {
          console.error('User not found:', userError?.message || 'No user data');
          return;
        }

        // Check if view exists
        const { data: viewData, error: viewError } = await supabase
          .from('view_history')
          .select('view_id')
          .eq('user_id', userData.user_id)
          .eq('product_id', product.product_id)
          .single();

        if (viewError && viewError.code !== 'PGRST116') {
          throw viewError; // PGRST116 means no rows found, which is fine
        }

        if (viewData) {
          // Update existing view's timestamp
          const { error: updateError } = await supabase
            .from('view_history')
            .update({ viewed_at: new Date().toISOString() })
            .eq('view_id', viewData.view_id);

          if (updateError) throw updateError;
        } else {
          // Insert new view
          const { error: insertError } = await supabase
            .from('view_history')
            .insert([
              {
                user_id: userData.user_id,
                product_id: product.product_id,
                viewed_at: new Date().toISOString(),
              },
            ]);

          if (insertError) throw insertError;
        }
      } catch (error) {
        console.error('Error logging view history:', error.message || error);
      }
    };

    logViewHistory();
  }, [product.product_id]);

  const handleAddToCart = async () => {
    // Validation checks
    if (typeof selectedQuantity !== 'number' || selectedQuantity < 1) {
      Alert.alert('錯誤', '請輸入有效的商品數量');
      return;
    }

    if (selectedQuantity > product.stock) {
      Alert.alert('錯誤', `庫存不足，最多可添加 ${product.stock} 件`);
      return;
    }

    try {
      // Get current user
      const userEmail = await AsyncStorage.getItem('isLoggedIn');
      if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
        Alert.alert('錯誤', '用戶未登錄');
        navigation.navigate('Login');
        return;
      }

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData?.user_id) {
        throw userError || new Error('用戶不存在');
      }

      // Check existing cart items
      const { data: cartData, error: cartError } = await supabase
        .from('shopping_cart')
        .select('quantity')
        .eq('user_id', userData.user_id)
        .eq('product_id', product.product_id);

      if (cartError) throw cartError;

      const existingItem = cartData?.length > 0 ? cartData[0] : null;

      // Calculate new quantity
      let newQuantity = selectedQuantity;
      if (existingItem) {
        newQuantity += existingItem.quantity;
        if (newQuantity > product.stock) {
          Alert.alert('錯誤', `購物車中已有 ${existingItem.quantity} 件，無法添加更多`);
          return;
        }
      }

      // Update or insert
      if (existingItem) {
        const { error: updateError } = await supabase
          .from('shopping_cart')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.user_id)
          .eq('product_id', product.product_id);

        if (updateError) throw updateError;
      } else {
        console.log('Inserting:', {
          user_id: userData.user_id,
          product_id: product.product_id,
          quantity: selectedQuantity
        });

        const { error: insertError } = await supabase
          .from('shopping_cart')
          .insert([{
            user_id: userData.user_id,
            product_id: product.product_id,
            quantity: selectedQuantity
          }]);

        if (insertError) throw insertError;
      }

      Alert.alert('成功', '商品已加入購物車');
      setModalVisible(false);
    } catch (error) {
      console.error('完整錯誤日誌:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      Alert.alert('錯誤', `操作失敗: ${error.message || '請稍後重試'}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Header searchQuery={""} setSearchQuery={() => {}} />
        <Image
          source={{ uri: product.image_data }}
          style={styles.productImage}
          resizeMode="contain"
        />
        
        <View style={styles.detailSection}>
          <Text style={styles.productName}>{product.product_name}</Text>
          
          <View style={styles.priceStockContainer}>
            <Text style={styles.price}>${product.price}</Text>
            <Text style={styles.stock}>{product.stock} in stock</Text>
          </View>

          <Text style={styles.sectionTitle}>产品简述</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>Product ID: {product.product_id}</Text>
            <Text style={styles.metaText}>Category: {product.category_id}</Text>
            <Text style={styles.metaText}>
              Listed: {new Date(product.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.metaText}>
              Last updated: {new Date(product.updated_at).toLocaleDateString()}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="shopping-cart" size={20} color="white" />
            <Text style={styles.buttonText}> 加入購物車</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments</Text>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Text style={styles.commentUser}>{comment.user}</Text>
              <Text style={styles.commentText}>{comment.comment}</Text>
              <Text style={styles.commentDate}>{comment.date}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {/* Quantity Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Quantity</Text>
            <TextInput
              style={styles.quantityInput}
              keyboardType="number-pad"
              value={String(selectedQuantity)}
              onChangeText={text => {
                const num = parseInt(text.replace(/[^0-9]/g, ''), 10) || 1;
                const clamped = Math.max(1, Math.min(product.stock, num));
                setSelectedQuantity(clamped);
              }}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleAddToCart}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <CustBar navigation={navigation} activeScreen="ProductDetail" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff',
    paddingBottom: 80, // Extra padding to avoid overlap with CustBar
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f8f8',
  },
  detailSection: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  priceStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2CB696',
  },
  stock: {
    fontSize: 16,
    color: '#666',
    alignSelf: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 25,
  },
  metaInfo: {
    marginBottom: 30,
  },
  metaText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  addToCartButton: {
    flexDirection: 'row',
    backgroundColor: '#2CB696',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    backgroundColor: '#2CB696',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  commentsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentItem: {
    marginBottom: 15,
  },
  commentUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  commentDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
});

export default ProductDetail;
