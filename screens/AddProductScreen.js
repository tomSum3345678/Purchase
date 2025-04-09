import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabaseClient';
import MimeType from 'react-native-mime-types';

const AddProduct = ({ navigation }) => {
  const [form, setForm] = useState({
    productName: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
  });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Request permission and pick image
  const pickImage = async () => {
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
  };

  // Handle form submission
  const handleUpload = async () => {
    if (!validateForm()) return;
    if (!image) {
      Alert.alert('错误', '请选择产品图片');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImage();
      await insertProduct(imageUrl);
      
      Alert.alert('成功', '产品已成功添加', [
        { text: '确定', onPress: () => navigation.goBack() }
      ]);
      resetForm();
    } catch (error) {
      Alert.alert('错误', error.message || '添加产品时出错');
    } finally {
      setUploading(false);
    }
  };

  // Upload image to Supabase 'image' bucket
  const uploadImage = async () => {
    const mimeType = await MimeType.getType(image);
    const extension = MimeType.extension(mimeType);
    const fileName = `product_${Date.now()}.${extension}`;

    const response = await fetch(image);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('image') // Changed to 'image' bucket
      .upload(fileName, blob, {
        cacheControl: '3600',
        contentType: mimeType,
      });

    if (error) throw new Error(`图片上传失败: ${error.message}`);

    const publicUrl = supabase.storage
      .from('image')
      .getPublicUrl(fileName).data.publicUrl;

    if (!publicUrl) throw new Error('无法生成图片的公共URL');

    return publicUrl;
  };

  // Insert product into database
  const insertProduct = async (imageUrl) => {
    const { error } = await supabase.from('products').insert({
      product_name: form.productName,
      description: form.description || null,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      category_id: parseInt(form.categoryId),
      image_data: imageUrl,
    });

    if (error) throw new Error(`数据库错误: ${error.message}`);
  };

  // Validate form fields
  const validateForm = () => {
    const requiredFields = ['productName', 'price', 'stock', 'categoryId'];
    if (requiredFields.some(field => !form[field].trim())) {
      Alert.alert('错误', '请填写所有必填字段');
      return false;
    }
    if (isNaN(form.price) || isNaN(form.stock) || isNaN(form.categoryId)) {
      Alert.alert('错误', '价格、库存和分类ID必须为数字');
      return false;
    }
    if (parseFloat(form.price) <= 0 || parseInt(form.stock) < 0 || parseInt(form.categoryId) <= 0) {
      Alert.alert('错误', '价格必须大于0，库存不能为负数，分类ID必须为正数');
      return false;
    }
    return true;
  };

  // Reset form after submission
  const resetForm = () => {
    setForm({
      productName: '',
      description: '',
      price: '',
      stock: '',
      categoryId: '',
    });
    setImage(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>添加新产品</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          placeholder="产品名称 *"
          value={form.productName}
          onChangeText={v => setForm(p => ({ ...p, productName: v }))}
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="描述（可选）"
          value={form.description}
          onChangeText={v => setForm(p => ({ ...p, description: v }))}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="价格（HKD） *"
          value={form.price}
          onChangeText={v => setForm(p => ({ ...p, price: v }))}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="库存数量 *"
          value={form.stock}
          onChangeText={v => setForm(p => ({ ...p, stock: v }))}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="分类ID *"
          value={form.categoryId}
          onChangeText={v => setForm(p => ({ ...p, categoryId: v }))}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={pickImage}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>选择图片</Text>
        </TouchableOpacity>

        {image && (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        )}

        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>提交产品</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2CB696',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3F51B5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
  },
});

export default AddProduct;