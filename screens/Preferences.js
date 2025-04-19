import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import CustBar from './CustBar';

const Preferences = ({ navigation }) => {
  const [userId, setUserId] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch user, preferences, and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is logged in
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          Alert.alert('錯誤', '請先登錄');
          navigation.replace('Login');
          return;
        }

        // Fetch user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || '用戶不存在');
        }
        setUserId(userData.user_id);

        // Fetch user preferences
        const { data: prefData, error: prefError } = await supabase
          .from('user_preferences')
          .select('preference_id, category_id, categories(category_name)')
          .eq('user_id', userData.user_id);

        if (prefError) throw prefError;
        setPreferences(prefData || []);

        // Fetch all categories
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('category_id, category_name')
          .order('category_name', { ascending: true });

        if (catError) throw catError;
        setCategories(catData || []);
      } catch (error) {
        console.error('Error fetching data:', error.message || error);
        Alert.alert('錯誤', '無法加載偏好數據，請稍後重試');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigation]);

  // Handle category selection in modal
  const handleCategorySelect = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    } else if (selectedCategories.length + preferences.length < 3) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      Alert.alert('提示', '最多只能選擇三個偏好');
    }
  };

  // Handle adding new preferences
  const handleAddPreferences = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('提示', '請至少選擇一個類別');
      return;
    }

    try {
      const { error } = await supabase.from('user_preferences').insert(
        selectedCategories.map((categoryId) => ({
          user_id: userId,
          category_id: categoryId,
        }))
      );

      if (error) throw error;

      // Refresh preferences
      const { data: prefData, error: prefError } = await supabase
        .from('user_preferences')
        .select('preference_id, category_id, categories(category_name)')
        .eq('user_id', userId);

      if (prefError) throw prefError;
      setPreferences(prefData || []);
      setSelectedCategories([]);
      setModalVisible(false);
      Alert.alert('成功', '偏好已更新');
    } catch (error) {
      console.error('Error adding preferences:', error.message || error);
      Alert.alert('錯誤', '無法添加偏好：' + error.message);
    }
  };

  // Handle deleting a preference
  const handleDeletePreference = (preferenceId, categoryName) => {
    Alert.alert(
      '確認刪除',
      `確定要刪除偏好 "${categoryName}" 嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_preferences')
                .delete()
                .eq('preference_id', preferenceId)
                .eq('user_id', userId);

              if (error) throw error;

              setPreferences(preferences.filter((p) => p.preference_id !== preferenceId));
              Alert.alert('成功', '偏好已刪除');
            } catch (error) {
              console.error('Error deleting preference:', error.message || error);
              Alert.alert('錯誤', '無法刪除偏好：' + error.message);
            }
          },
        },
      ]
    );
  };

  // Render category item in modal
  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategories.includes(item.category_id) && styles.categoryItemSelected,
      ]}
      onPress={() => handleCategorySelect(item.category_id)}
    >
      <Text style={styles.categoryText}>{item.category_name}</Text>
      {selectedCategories.includes(item.category_id) && (
        <Icon name="check" size={20} color="#2CB696" />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2CB696" />
        </View>
        <CustBar navigation={navigation} activeScreen="Preferences" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>偏好管理</Text>
        </View>

        {preferences.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>您尚未選擇任何偏好</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.buttonText}>新增偏好</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.preferencesContainer}>
              {preferences.map((pref) => (
                <View key={pref.preference_id} style={styles.preferenceCard}>
                  <Text style={styles.preferenceText}>{pref.categories.category_name}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePreference(pref.preference_id, pref.categories.category_name)}
                  >
                    <Icon name="delete" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {preferences.length < 3 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.buttonText}>新增偏好</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>選擇書本種類</Text>
            <Text style={styles.modalSubtitle}>
              最多可選 {3 - preferences.length} 個類別
            </Text>
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.category_id.toString()}
              style={styles.categoryList}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddPreferences}
              >
                <Text style={styles.buttonText}>確認</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedCategories([]);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustBar navigation={navigation} activeScreen="Preferences" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  preferencesContainer: {
    marginBottom: 20,
  },
  preferenceCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deleteButton: {
    padding: 5,
  },
  addButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryItemSelected: {
    backgroundColor: '#e6f4f1',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  confirmButton: {
    backgroundColor: '#2CB696',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Preferences;