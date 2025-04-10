// screens/OrderChat.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OrderChat = ({ navigation, route }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const { orderId } = route.params;

  useEffect(() => {
    const fetchUserAndMessages = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        if (!email) {
          Alert.alert('错误', '请先登录');
          navigation.navigate('Login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, role')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          throw new Error(userError?.message || 'User not found');
        }

        setUserId(userData.user_id);
        setUserRole(userData.role);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('order_messages')
          .select('message_id, user_id, message_text, sent_at, is_sales')
          .eq('order_id', orderId)
          .order('sent_at', { ascending: true });

        if (messagesError) throw messagesError;

        setMessages(messagesData || []);
        setLoading(false);

        // Subscribe to real-time updates
        const subscription = supabase
          .channel(`order_messages:order_id=${orderId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` }, (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          })
          .subscribe();

        return () => supabase.removeChannel(subscription);
      } catch (error) {
        console.error('Error fetching chat data:', error.message || error);
        Alert.alert('错误', '无法加载聊天记录');
        setLoading(false);
      }
    };

    fetchUserAndMessages();
  }, [navigation, orderId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          user_id: userId,
          message_text: newMessage.trim(),
          is_sales: userRole === 'admin',
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error.message || error);
      Alert.alert('错误', '发送消息失败');
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.is_sales ? styles.salesMessage : styles.customerMessage]}>
      <Text style={styles.messageText}>{item.message_text}</Text>
      <Text style={styles.messageTime}>{new Date(item.sent_at).toLocaleTimeString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>订单 #{orderId} 聊天室</Text>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id.toString()}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="输入消息..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  messageList: {
    paddingBottom: 80, // Space for input area
  },
  messageBubble: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    maxWidth: '80%',
  },
  customerMessage: {
    backgroundColor: '#e6f5f0',
    alignSelf: 'flex-start',
  },
  salesMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2CB696',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendButtonText: {
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

export default OrderChat;