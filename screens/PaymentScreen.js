import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabaseClient';

const PaymentScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('order_id, total_amount, payment_method, payment_proof_image, payment_status')
          .eq('order_id', orderId)
          .single();

        if (error) throw error;

        setOrder(data);
        if (data.payment_proof_image || data.payment_status === 'pending_review' || data.payment_status === 'paid') {
          setImage(data.payment_proof_image);
          setUploaded(true);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order:', error.message || error);
        Alert.alert('错误', '无法加载订单数据');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限拒绝', '需要访问相册权限以选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('错误', '选择图片时发生错误');
    }
  };

  const uploadImage = async () => {
    if (!image) {
      Alert.alert('错误', '请先选择图片');
      return;
    }

    setUploading(true);
    try {
      const fileExt = image.split('.').pop().toLowerCase() || 'jpg';
      const fileName = `payment_proof_${orderId}_${Date.now()}.${fileExt}`;
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      const { error: uploadError } = await supabase.storage
        .from('image')
        .upload(fileName, {
          uri: image,
          type: contentType,
          name: fileName,
        }, {
          cacheControl: '3600',
          contentType: contentType,
        });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage
        .from('image')
        .getPublicUrl(fileName).data.publicUrl;

      if (!publicUrl) throw new Error('无法生成图片的公共URL');

      // Update order with payment proof image and payment status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_proof_image: publicUrl,
          payment_status: 'pending_review',
        })
        .eq('order_id', orderId);

      if (updateError) throw updateError;

      setUploaded(true);
      setUploading(false);
      Alert.alert('成功', '付款证明已上传');
    } catch (error) {
      console.error('Error uploading image:', error.message || error);
      Alert.alert('错误', '上传图片失败');
      setUploading(false);
    }
  };

  const handleUpload = () => {
    Alert.alert(
      '确认上传',
      '确定要上传此图片吗？',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: uploadImage },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>订单不存在</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>付款</Text>
      <Text style={styles.totalAmount}>
        订单总金额: ${order.total_amount.toFixed(2)}
      </Text>

      {!uploaded && (
        <View style={styles.paymentInfo}>
          {order.payment_method === 'PayMe' ? (
            <>
              <Text style={styles.paymentText}>
                一按即 PayMe！请使用以下的PayMe URL完成支付，并选择图片上传您的付款证明：
              </Text>
              <Text
                style={styles.paymentLink}
                onPress={() => Linking.openURL('https://payme.hsbc/sswbook')}
              >
                https://payme.hsbc/sswbook
              </Text>
            </>
          ) : order.payment_method === 'WeChat' ? (
            <>
              <Text style={styles.paymentText}>
                请按照以下微信付款信息完成支付，并选择图片上传您的付款证明：
              </Text>
              <Image
                source={{
                  uri: 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image/payment_wechat.jpeg',
                }}
                style={styles.wechatImage}
              />
            </>
          ) : (
            <Text style={styles.paymentText}>未指定付款方式</Text>
          )}
        </View>
      )}

      <View style={styles.imageContainer}>
        {image && (
          <View style={styles.imageFrame}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
          </View>
        )}
        {!uploaded ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, uploading && styles.buttonDisabled]}
              onPress={pickImage}
              disabled={uploading}
            >
              <Text style={styles.buttonText}>选择图片</Text>
            </TouchableOpacity>
            {image && (
              <TouchableOpacity
                style={[styles.button, uploading && styles.buttonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>上传付款证明</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.postUploadContainer}>
            <Text style={styles.waitingText}>
              {order.payment_status === 'paid'
                ? '您的付款已确认，请等待发货。'
                : '您已上传付款证明，请等待我们审核。'}
            </Text>
            <TouchableOpacity
              style={styles.returnButton}
              onPress={() => navigation.navigate('ViewOrders')}
            >
              <Text style={styles.buttonText}>返回訂單頁面</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '500',
    color: '#2CB696',
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  paymentLink: {
    fontSize: 16,
    color: '#1E90FF',
    textDecorationLine: 'underline',
  },
  wechatImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginTop: 10,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  imageFrame: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2CB696',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  imagePreview: {
    width: 280,
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  postUploadContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  waitingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  returnButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '60%',
    alignItems: 'center',
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

export default PaymentScreen;