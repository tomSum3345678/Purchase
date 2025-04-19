import React, { useState, useEffect } from 'react';
import { View, TextInput, Alert, StyleSheet, ImageBackground, Platform, Dimensions, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Hide the default back arrow
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('isLoggedIn');
        const role = await AsyncStorage.getItem('loginRole');
        if (value != null) {
          if (role === "user") {
            navigation.navigate("HomePage");
          } else if (role === "admin") {
            navigation.navigate("SalesHome");
          }
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };
    checkLoginStatus();
  }, [navigation]);

  const handleLogin = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('loginRole');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      Alert.alert('登錄失敗', '無效的電子郵件或密碼');
    } else {
      await AsyncStorage.setItem('isLoggedIn', email);
      const { role } = data;
      if (role === 'admin') {
        await AsyncStorage.setItem('loginRole', "admin");
        navigation.replace('SalesHome');
      } else if (role === 'user') {
        await AsyncStorage.setItem('loginRole', "user");
        navigation.replace('HomePage');
      } else {
        Alert.alert('登錄失敗', '用戶角色未識別');
      }
    }
  };

  const handleRegister = () => {
    navigation.navigate('RegisterForm');
  };

  return (
    <ImageBackground
      source={require('../assets/loginImage.png')}
      style={styles.container}
    >
      <View style={{ flex: 1, backgroundColor: Platform.OS !== "web" ? "rgba(255, 255, 255, 0.6)" : "", justifyContent: "center", padding: 20 }}>
        <View style={{ backgroundColor: Platform.OS === "web" ? 'rgba(255, 255, 255, 0.45)' : "", marginHorizontal: Platform.OS === "web" ? Dimensions.get("window").width > 1000 ? "32%" : "18%" : "0", borderRadius: 10 }}>
          <View style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 48, fontStyle: "italic", color: Platform.OS === "web" ? "rgb(156, 61, 61)" : "rgb(13, 86, 122)" }}>SSW BookHub</Text>
          </View>
          <View style={{ margin: Platform.OS === "web" ? "40px" : "0" }}>
            <TextInput
              style={styles.input}
              placeholder="電子郵件"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="密碼"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>登錄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={handleRegister}>
              <Text style={styles.buttonText}>註冊</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: '#003366',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontSize: 21,
  },
});

export default LoginScreen;