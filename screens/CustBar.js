// screens/CustBar.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const CustBar = ({ navigation, activeScreen }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('HomePage')}
      >
        <Icon
          name="home"
          size={24}
          color={activeScreen === 'HomePage' ? '#2CB696' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'HomePage' && styles.activeText,
          ]}
        >
          主页
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('Messages')} // Placeholder for Messages screen
      >
        <Icon
          name="envelope"
          size={24}
          color={activeScreen === 'Messages' ? '#2CB696' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'Messages' && styles.activeText,
          ]}
        >
          消息
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('ShoppingCart')}
      >
        <Icon
          name="shopping-cart"
          size={24}
          color={activeScreen === 'ShoppingCart' ? '#2CB696' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'ShoppingCart' && styles.activeText,
          ]}
        >
          购物车
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('ViewOrders')} // Placeholder for ViewOrders screen
      >
        <MaterialIcons
          name="receipt"
          size={24}
          color={activeScreen === 'ViewOrders' ? '#2CB696' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'ViewOrders' && styles.activeText,
          ]}
        >
          订单
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 5,
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeText: {
    color: '#2CB696',
  },
});

export default CustBar;