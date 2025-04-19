import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CommentForm = ({ navigation, route }) => {
  const { productId, commentId, initialRating, initialCommentText, isEdit } = route.params;
  const [rating, setRating] = useState(initialRating || 0);
  const [commentText, setCommentText] = useState(initialCommentText || '');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          Alert.alert('錯誤', '請先登錄');
          navigation.navigate('Login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw userError || new Error('用戶不存在');
        }

        setUserId(userData.user_id);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user:', error.message || error);
        Alert.alert('錯誤', '無法加載用戶數據');
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigation]);

  const submitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('錯誤', '請輸入評論內容');
      return;
    }
    if (rating < 1 || rating > 5) {
      Alert.alert('錯誤', '請選擇 1-5 星的評分');
      return;
    }

    try {
      if (isEdit) {
        // Update existing comment
        const { error } = await supabase
          .from('comments')
          .update({
            rating,
            comment_text: commentText.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('comment_id', commentId)
          .eq('user_id', userId);

        if (error) {
          Alert.alert('錯誤', '更新評論失敗：' + error.message);
          throw error;
        }

        Alert.alert('成功', '評論已更新，感謝您的反饋！');
      } else {
        // Insert new comment
        const { error } = await supabase.from('comments').insert({
          user_id: userId,
          product_id: productId,
          rating,
          comment_text: commentText.trim(),
        });

        if (error) {
          if (error.message.includes('has not purchased')) {
            Alert.alert('錯誤', '您尚未完成對此產品的購買，無法評論');
          } else if (error.message.includes('unique_user_product_comment')) {
            Alert.alert('錯誤', '您已對此產品發表過評論');
          } else {
            Alert.alert('錯誤', '提交評論失敗：' + error.message);
          }
          throw error;
        }

        Alert.alert('成功', '評論已提交，感謝您的反饋！');
      }

      setCommentText('');
      setRating(0);
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting comment:', error.message || error);
    }
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
      <View style={styles.container}>
        <Text style={styles.title}>{isEdit ? '編輯評論' : '發表評論'}</Text>
        <Text style={styles.label}>評分 (1-5 星):</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Text
                style={rating >= star ? styles.starSelected : styles.star}
              >
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>評論內容:</Text>
        <TextInput
          style={styles.input}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="輸入您的評論..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.submitButton} onPress={submitComment}>
          <Text style={styles.buttonText}>{isEdit ? '更新評論' : '提交評論'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>取消</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  starButton: {
    marginRight: 8,
  },
  star: {
    fontSize: 24,
    color: '#ccc',
  },
  starSelected: {
    fontSize: 24,
    color: '#FFD700',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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

export default CommentForm;