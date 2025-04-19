import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterForm = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: User info, 2: Preferences
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Password requirements regex
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

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

  // Handle preference selection (max 3)
  const togglePreference = (categoryId) => {
    if (selectedPreferences.includes(categoryId)) {
      setSelectedPreferences(selectedPreferences.filter((id) => id !== categoryId));
    } else if (selectedPreferences.length < 3) {
      setSelectedPreferences([...selectedPreferences, categoryId]);
    } else {
      Alert.alert('提示', '最多只能選擇3個偏好');
    }
  };

  // Validate and proceed to next step
  const handleNext = () => {
    if (!email.trim() || !password.trim() || !username.trim() || !confirmPassword.trim()) {
      Alert.alert('錯誤', '請填寫所有必填字段');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('錯誤', '請輸入有效的電子郵件地址');
      return;
    }
    if (!passwordRegex.test(password)) {
      Alert.alert('錯誤', '密碼必須包含至少8個字符，包括大寫字母、小寫字母、數字和特殊字符（!@#$%^&*）');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('錯誤', '密碼和確認密碼不匹配');
      return;
    }
    setStep(2);
  };

  // Go back to previous step
  const handleBack = () => {
    setStep(1);
  };

  // Handle registration
  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // Insert user into users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ email, password, username, role: 'user' }])
        .select()
        .single();

      if (userError) {
        if (userError.code === '23505') {
          throw new Error('電子郵件或用戶名已被使用');
        }
        throw userError;
      }

      const userId = userData.user_id;

      // Insert preferences if any
      if (selectedPreferences.length > 0) {
        const preferences = selectedPreferences.map((categoryId) => ({
          user_id: userId,
          category_id: categoryId,
        }));
        const { error: prefError } = await supabase
          .from('user_preferences')
          .insert(preferences);
        if (prefError) throw prefError;
      }

      // Set login status
      await AsyncStorage.setItem('isLoggedIn', email);
      await AsyncStorage.setItem('loginRole', 'user');

      Alert.alert('成功', '註冊成功！', [
        {
          text: '確定',
          onPress: () => navigation.replace('HomePage'),
        },
      ]);
    } catch (error) {
      console.error('Error registering user:', error);
      Alert.alert('錯誤', error.message || '註冊失敗，請稍後重試');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skip preferences
  const handleSkip = async () => {
    await handleRegister();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.header}>註冊</Text>

        {step === 1 ? (
          <>
            <Text style={styles.label}>電子郵件</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="輸入電子郵件"
              keyboardType="email-address"
            />

            <Text style={styles.label}>用戶名</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="輸入用戶名"
            />

            <Text style={styles.label}>密碼</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="輸入密碼"
              secureTextEntry
            />
            <Text style={styles.passwordHint}>
              密碼需至少8個字符，包含大寫字母、小寫字母、數字和特殊字符（!@#$%^&*）
            </Text>

            <Text style={styles.label}>確認密碼</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="再次輸入密碼"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleNext}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>下一步</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>選擇偏好（最多3個，可跳過）</Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.category_id}
                style={[
                  styles.preferenceItem,
                  selectedPreferences.includes(category.category_id) && styles.selectedPreference,
                ]}
                onPress={() => togglePreference(category.category_id)}
                disabled={isLoading}
              >
                <Text style={styles.preferenceText}>{category.category_name}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={handleBack}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>上一步</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>完成</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={handleSkip}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>跳過</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#e1e1ee',
    padding: 20,
  },
  formContainer: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.45)' : '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#003366',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  preferenceItem: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  selectedPreference: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  preferenceText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#ff4d4f',
  },
  skipButton: {
    backgroundColor: '#003366',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterForm;