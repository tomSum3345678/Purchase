import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabaseClient';

const ProductInfo = ({ navigation, route }) => {
  const { product } = route.params;
  const [productName, setProductName] = useState(product.product_name);
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [description, setDescription] = useState(product.description || '');
  const [stock, setStock] = useState(product.stock.toString());
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(product.image_data);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, category_name');
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        Alert.alert('錯誤', '無法加載分類，請稍後重試');
      }
    };
    fetchCategories();
  }, []);

  // Request permission and pick image
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('權限拒絕', '需要訪問相冊權限以選擇圖片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: true,
        // aspect: [16, 9], // Wider ratio for larger cropping area
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert('錯誤', '選擇圖片時發生錯誤: ' + error.message);
    }
  };

  // Upload image to Supabase 'image' bucket
  const uploadImage = async () => {
    try {
      const fileExt = image.split('.').pop().toLowerCase() || 'jpg';
      const fileName = `product_${Date.now()}.${fileExt}`;

      let contentType;
      switch (fileExt) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        default:
          contentType = 'image/jpeg';
      }

      const { error } = await supabase.storage
        .from('image')
        .upload(fileName, {
          uri: image,
          type: contentType,
          name: fileName,
        }, {
          cacheControl: '3600',
          contentType: contentType,
        });

      if (error) {
        throw new Error(`圖片上傳失敗: ${error.message}`);
      }

      const publicUrl = supabase.storage
        .from('image')
        .getPublicUrl(fileName).data.publicUrl;

      if (!publicUrl) throw new Error('無法生成圖片的公共URL');

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      throw error;
    }
  };

  // Handle save action
  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('錯誤', '產品名稱不能為空');
      return;
    }
    const stockValue = parseInt(stock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      Alert.alert('錯誤', '庫存數量必須為非負整數');
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = product.image_data;
      if (image !== product.image_data) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('products')
        .update({
          product_name: productName,
          category_id: categoryId,
          description: description || null,
          stock: stockValue,
          image_data: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', product.product_id);
      if (error) throw error;

      Alert.alert('成功', '產品資訊已更新', [
        {
          text: '確定',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('錯誤', '無法更新產品資訊，請稍後重試');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>編輯產品</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003366" />
          <Text style={styles.loadingText}>正在處理...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formContainer}>
            <Text style={styles.label}>產品名稱</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="輸入產品名稱"
            />

            <Text style={styles.label}>分類</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categoryId}
                onValueChange={(value) => setCategoryId(value)}
                style={styles.picker}
              >
                {categories.map((category) => (
                  <Picker.Item
                    key={category.category_id}
                    label={category.category_name}
                    value={category.category_id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>描述</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="輸入產品描述"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>庫存數量</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              placeholder="輸入庫存數量"
              keyboardType="numeric"
            />

            <Text style={styles.label}>產品圖片</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickImage}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>選擇新圖片</Text>
            </TouchableOpacity>
            {image && (
              <Image
                source={{ uri: image }}
                style={styles.imagePreview}
              />
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e1e1ee',
  },
  header: {
    backgroundColor: '#003366',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    elevation: 2,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: Dimensions.get('window').height * 0.35,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
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
});

export default ProductInfo;