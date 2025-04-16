// App.js
import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MainPage from './screens/CustomerMainPage';
import ProductDetail from './screens/ProductDetailPage';
import SalesHome from './screens/SalesHomeScreen'
import LoginScreen from './screens/LoginScreen';
import UserProfile from './screens/UserProfileScreen';
import AddProduct from './screens/AddProductScreen';
import ShoppingCart from './screens/ShoppingCartScreen';
import CheckoutConfirmation from './screens/CheckoutConfirmation';
import OrderCreation from './screens/OrderCreation';
import ViewOrders from './screens/ViewOrders';
import OrderDetails from './screens/OrderDetails';
import Messages from './screens/Messages';
import OrderChat from './screens/OrderChat';
import StockScreen from './screens/StockScreen';
import PaymentScreen from './screens/PaymentScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <Stack.Navigator initialRouteName='Login'>
          <Stack.Screen name="HomePage" component={MainPage} options={{ headerShown: false }}/>
          <Stack.Screen name="Product Detail" component={ProductDetail} />
          <Stack.Screen name="SalesHome" component={SalesHome} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="UserProfile" component={UserProfile} />
          <Stack.Screen name="AddProduct" component={AddProduct} />
          <Stack.Screen name="ShoppingCart" component={ShoppingCart} />
          <Stack.Screen name="CheckoutConfirmation" component={CheckoutConfirmation} />
          <Stack.Screen name="OrderCreation" component={OrderCreation} />
          <Stack.Screen name="ViewOrders" component={ViewOrders} />
          <Stack.Screen name="OrderDetails" component={OrderDetails} />
          <Stack.Screen name="Messages" component={Messages} />
          <Stack.Screen name="OrderChat" component={OrderChat} />
          <Stack.Screen name="Inventory" component={StockScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          {/* Add other screens here */}
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;