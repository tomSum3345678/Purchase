import React, { useState } from 'react';
import { View, TextInput, Button, Image, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabaseClient';
import MimeType from 'react-native-mime-types';

const AddProduct = () => {
  // State management
  const [form, setForm] = useState({
    productName: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
  });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Access to the photo library is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!validateForm()) return;
    if (!image) {
      Alert.alert('Please select an image');
      return;
    }

    setUploading(true);
    try {
      // Upload image
      const imageUrl = await uploadImage();
      
      // Insert into database
      await insertProduct(imageUrl);
      
      Alert.alert('Success', 'Product has been added successfully');
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Image upload logic
  const uploadImage = async () => {
    const extension = MimeType.extension(await MimeType.getType(image));
    const fileName = `products/${Date.now()}.${extension}`;

    const response = await fetch(image);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('products')
      .upload(fileName, blob, {
        cacheControl: '3600',
        contentType: blob.type,
      });

    if (error) throw new Error(`Image upload failed: ${error.message}`);
    
    return supabase.storage
      .from('products')
      .getPublicUrl(data.path)
      .data.publicUrl;
  };

  // Database insert
  const insertProduct = async (imageUrl) => {
    const { error } = await supabase.from('products').insert({
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      category_id: parseInt(form.categoryId),
      image_data: imageUrl,
    });

    if (error) throw new Error(`Database error: ${error.message}`);
  };

  // Form validation
  const validateForm = () => {
    const requiredFields = ['productName', 'price', 'stock', 'categoryId'];
    if (requiredFields.some(field => !form[field])) {
      Alert.alert('Please fill out all required fields');
      return false;
    }
    if (isNaN(form.price) || isNaN(form.stock) || isNaN(form.categoryId)) {
      Alert.alert('Invalid format for numeric fields');
      return false;
    }
    return true;
  };

  // Reset form
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
    <View style={styles.container}>
      <TextInput
        placeholder="Product Name*"
        value={form.productName}
        onChangeText={v => setForm(p => ({...p, productName: v}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={form.description}
        onChangeText={v => setForm(p => ({...p, description: v}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Price*"
        value={form.price}
        onChangeText={v => setForm(p => ({...p, price: v}))}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Stock*"
        value={form.stock}
        onChangeText={v => setForm(p => ({...p, stock: v}))}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Category ID*"
        value={form.categoryId}
        onChangeText={v => setForm(p => ({...p, categoryId: v}))}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button 
        title="Select Image" 
        onPress={pickImage} 
        disabled={uploading}
      />

      {image && <Image source={{ uri: image }} style={styles.image} />}

      {uploading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <Button
          title="Submit Product"
          onPress={handleUpload}
          color="#3f51b5"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 16,
  },
  loader: {
    marginVertical: 24,
  },
});

export default AddProduct;