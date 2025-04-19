import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
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
  const [comments, setComments] = useState([]);
  const [userId, setUserId] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userComment, setUserComment] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  // Fetch user, comments, purchase status, and rating stats
  const fetchData = async () => {
    try {
      // Get user
      const userEmail = await AsyncStorage.getItem('isLoggedIn');
      let currentUserId = null;
      if (userEmail && /^\S+@\S+\.\S+$/.test(userEmail)) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', userEmail)
          .single();

        if (userError || !userData?.user_id) {
          console.error('User not found:', userError?.message || 'No user data');
        } else {
          currentUserId = userData.user_id;
          setUserId(currentUserId);

          // Check if user has purchased the product
          const { data: purchaseData, error: purchaseError } = await supabase
            .rpc('has_purchased_product', {
              p_user_id: currentUserId,
              p_product_id: product.product_id,
            });

          if (purchaseError) {
            console.error('Purchase check error:', purchaseError);
            throw new Error('Failed to check purchase status');
          }
          setHasPurchased(purchaseData);

          // Check if user has commented
          const { data: commentData, error: commentError } = await supabase
            .from('comments')
            .select('comment_id, rating, comment_text')
            .eq('user_id', currentUserId)
            .eq('product_id', product.product_id)
            .single();

          if (commentError && commentError.code !== 'PGRST116') {
            throw commentError;
          }
          setUserComment(commentData);
        }
      }

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          comment_id,
          user_id,
          rating,
          comment_text,
          created_at,
          updated_at,
          users (username)
        `)
        .eq('product_id', product.product_id)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);

      // Calculate average rating and comment count
      const { data: statsData, error: statsError } = await supabase
        .from('comments')
        .select('rating')
        .eq('product_id', product.product_id);

      if (statsError) throw statsError;
      const count = statsData.length;
      const avg = count > 0 ? statsData.reduce((sum, c) => sum + c.rating, 0) / count : 0;
      setCommentCount(count);
      setAverageRating(avg);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error.message || error);
      Alert.alert('錯誤', '無法加載數據，請稍後重試');
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [product.product_id, navigation]);

  // Real-time subscription for comments
  useEffect(() => {
    const subscription = supabase
      .channel(`comments:product_id=${product.product_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `product_id=eq.${product.product_id}`,
        },
        (payload) => {
          console.log('Comment change detected:', payload);
          fetchData(); // Refresh comments and stats
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [product.product_id]);

  // Log view history
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

        const { data: viewData, error: viewError } = await supabase
          .from('view_history')
          .select('view_id')
          .eq('user_id', userData.user_id)
          .eq('product_id', product.product_id)
          .single();

        if (viewError && viewError.code !== 'PGRST116') {
          throw viewError;
        }

        if (viewData) {
          const { error: updateError } = await supabase
            .from('view_history')
            .update({ viewed_at: new Date().toISOString() })
            .eq('view_id', viewData.view_id);

          if (updateError) throw updateError;
        } else {
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
    if (typeof selectedQuantity !== 'number' || selectedQuantity < 1) {
      Alert.alert('錯誤', '請選擇有效的商品數量');
      return;
    }

    if (selectedQuantity > product.stock) {
      Alert.alert('錯誤', `庫存不足，最多可添加 ${product.stock} 件`);
      return;
    }

    try {
      const userEmail = await AsyncStorage.getItem('isLoggedIn');
      if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
        Alert.alert('錯誤', '用戶未登錄');
        navigation.navigate('Login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData?.user_id) {
        throw userError || new Error('用戶不存在');
      }

      const { data: cartData, error: cartError } = await supabase
        .from('shopping_cart')
        .select('quantity')
        .eq('user_id', userData.user_id)
        .eq('product_id', product.product_id);

      if (cartError) throw cartError;

      const existingItem = cartData?.length > 0 ? cartData[0] : null;
      let newQuantity = selectedQuantity;
      if (existingItem) {
        newQuantity += existingItem.quantity;
        if (newQuantity > product.stock) {
          Alert.alert('錯誤', `購物車中已有 ${existingItem.quantity} 件，無法添加更多`);
          return;
        }
      }

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('shopping_cart')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userData.user_id)
          .eq('product_id', product.product_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('shopping_cart')
          .insert([
            {
              user_id: userData.user_id,
              product_id: product.product_id,
              quantity: selectedQuantity,
            },
          ]);

        if (insertError) throw insertError;
      }

      Alert.alert('成功', '商品已加入購物車');
      setModalVisible(false);
    } catch (error) {
      console.error('Error adding to cart:', error.message || error);
      Alert.alert('錯誤', `操作失敗: ${error.message || '請稍後重試'}`);
    }
  };

  const incrementQuantity = () => {
    if (selectedQuantity < product.stock) {
      setSelectedQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (selectedQuantity > 1) {
      setSelectedQuantity((prev) => prev - 1);
    }
  };

  const handleCommentPress = () => {
    if (userComment) {
      Alert.alert(
        '您已評論',
        '您已為該產品留言，是否要更改評論內容？',
        [
          {
            text: '取消',
            style: 'cancel',
          },
          {
            text: '確認',
            onPress: () =>
              navigation.navigate('CommentForm', {
                productId: product.product_id,
                commentId: userComment.comment_id,
                initialRating: userComment.rating,
                initialCommentText: userComment.comment_text,
                isEdit: true,
              }),
          },
        ]
      );
    } else {
      navigation.navigate('CommentForm', { productId: product.product_id });
    }
  };

  const handleEditComment = (comment) => {
    navigation.navigate('CommentForm', {
      productId: product.product_id,
      commentId: comment.comment_id,
      initialRating: comment.rating,
      initialCommentText: comment.comment_text,
      isEdit: true,
    });
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      '確認刪除',
      '您確定要刪除此評論嗎？此操作無法撤銷。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('comment_id', commentId)
                .eq('user_id', userId);

              if (error) {
                throw error;
              }
              Alert.alert('成功', '評論已刪除');
              fetchData(); // Refresh comments and stats
            } catch (error) {
              console.error('Error deleting comment:', error.message || error);
              Alert.alert('錯誤', '刪除評論失敗：' + error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加載中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Header searchQuery={''} setSearchQuery={() => {}} />
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
          <Text style={styles.sectionTitle}>產品簡述</Text>
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
          {hasPurchased && (
            <TouchableOpacity
              style={styles.commentButton}
              onPress={handleCommentPress}
            >
              <Icon name="comment" size={20} color="white" />
              <Text style={styles.buttonText}> 發表評論</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>評論</Text>
          <Text style={styles.ratingSummary}>
            平均評分：{averageRating.toFixed(1)} 星（{commentCount} 條評論）
          </Text>
          {comments.length === 0 ? (
            <Text style={styles.noCommentsText}>該產品尚未有評論</Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.comment_id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>
                    {comment.users.username}
                    {comment.user_id === userId && ' (您)'}
                  </Text>
                  {comment.user_id === userId && (
                    <View style={styles.commentActions}>
                      <TouchableOpacity
                        onPress={() => handleEditComment(comment)}
                      >
                        <Text style={styles.editButton}>編輯</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.comment_id)}
                        style={styles.deleteButtonContainer}
                      >
                        <Text style={styles.deleteButton}>刪除</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, index) => (
                    <Text
                      key={index}
                      style={
                        index < comment.rating
                          ? styles.starSelected
                          : styles.star
                      }
                    >
                      ★
                    </Text>
                  ))}
                </View>
                <Text style={styles.commentText}>{comment.comment_text}</Text>
                <Text style={styles.commentDate}>
                  評論於: {new Date(comment.created_at).toLocaleDateString()}
                </Text>
                {new Date(comment.updated_at).getTime() >
                  new Date(comment.created_at).getTime() && (
                  <Text style={styles.commentDate}>
                    已更新於:{' '}
                    {new Date(comment.updated_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>選擇數量</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={selectedQuantity <= 1}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{selectedQuantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
                disabled={selectedQuantity >= product.stock}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddToCart}
              >
                <Text style={styles.buttonText}>確認</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
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
    paddingBottom: 80,
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
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  ratingSummary: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
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
    marginBottom: 10,
  },
  commentButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityButton: {
    backgroundColor: '#2CB696',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    width: 50,
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
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginLeft: 10,
  },
  commentsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentItem: {
    marginBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  deleteButtonContainer: {
    marginLeft: 15,
  },
  deleteButton: {
    fontSize: 14,
    color: 'red',
    textDecorationLine: 'underline',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  star: {
    fontSize: 16,
    color: '#ccc',
  },
  starSelected: {
    fontSize: 16,
    color: '#FFD700',
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
  noCommentsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

export default ProductDetail;
