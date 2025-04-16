import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const AdminBar = ({ navigation, activeScreen }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('SalesHome')}
      >
        <MaterialIcons
          name="receipt"
          size={24}
          color={activeScreen === 'SalesHome' ? '#003366' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'SalesHome' && styles.activeText,
          ]}
        >
          訂單管理
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('Inventory')} // Placeholder for Inventory screen
      >
        <Icon
          name="archive"
          size={24}
          color={activeScreen === 'Inventory' ? '#003366' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'Inventory' && styles.activeText,
          ]}
        >
          庫存
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('SalesStatus')} // Placeholder for Sales Status screen
      >
        <Icon
          name="bar-chart"
          size={24}
          color={activeScreen === 'SalesStatus' ? '#003366' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'SalesStatus' && styles.activeText,
          ]}
        >
          銷售狀況
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('UserManagement')} // Placeholder for User Management screen
      >
        <Icon
          name="users"
          size={24}
          color={activeScreen === 'UserManagement' ? '#003366' : '#666'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'UserManagement' && styles.activeText,
          ]}
        >
          用戶管理
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
    color: '#003366',
  },
});

export default AdminBar;