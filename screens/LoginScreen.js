
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, ImageBackground, Platform, Dimensions, TouchableOpacity, Text } from 'react-native';
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
        const value = await AsyncStorage.getItem('isLoggedIn'); // Use await to retrieve the value
        const role = await AsyncStorage.getItem('loginRole'); // Use await to retrieve the value

        // const value2 = await console.log(AsyncStorage.getItem('loginRole'));
        // console.log(value2);
        if (value != null) { // Compare with string 'true'
          if (role == "user")
            navigation.navigate("HomePage"); // Navigate to Home
          else if (role == "admin") {
            navigation.navigate("SalesHome"); // Navigate to Home

          }
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus(); // Call the function
  }, [navigation]); // Dependency array includes navigation to avoid warnings

  const handleLogin = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('loginRole');


    // Fetch user from UserInfo table using email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password) 
      .single();

    if (error || !data) {
      Alert.alert('Login failed', 'Invalid email or password');
    } else {
      // Successfully logged in
      await AsyncStorage.setItem('isLoggedIn', email); // Save login status

      // Check the user's role
      const { role } = data; // Assuming the role is a column in the users table
      if (role === 'admin') {
        console.log(role);
        await AsyncStorage.setItem('loginRole', "admin"); // Save login status
        navigation.replace('SalesHome'); // Navigate to Admin Home
      } else if (role === 'user') {
        console.log(role);

        await AsyncStorage.setItem('loginRole', "user"); // Save login status

        navigation.replace('HomePage'); // Navigate to User Home
      } else {
        Alert.alert('Login failed', 'User role not recognized');
      }
    }
  };

  return (
    <ImageBackground
      source={require('../assets/loginImage.png')}
      style={[styles.container]}

    >
      <View style={{ flex: 1, backgroundColor: Platform.OS != "web" ? "rgba(255, 255, 255, 0.6)" : "", justifyContent: "center", padding: 20 }}>

        <View style={{ backgroundColor: Platform.OS == "web" ? 'rgba(255, 255, 255, 0.45)' : "", marginHorizontal: Platform.OS == "web" ? Dimensions.get("window").width > 1000 ? "32%" : "18%" : "0", borderRadius: 10 }}>
          <View style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 48, fontStyle: "italic", color: Platform.OS == "web" ? "rgb(156, 61, 61)" : "rgb(13, 86, 122)" }}>SSW BookHub</Text>
          </View>
          <View style={{ margin: Platform.OS == "web" ? "40px" : "0" }}>
            <TextInput style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {/* <Button title="Login" onPress={handleLogin} /> */}
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff', // White background for better contrast
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20, // Space below the title
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f8f8f8', // Light gray background for inputs
  },
  button: {
    backgroundColor: '#4CAF50', // Green background
    padding: 15,
    borderRadius: 5,
    elevation: 3, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  buttonText: {
    color: 'white', // Text color
    fontSize: 16, // Font size
    textAlign: 'center',
    fontSize: 21
  },
});
