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
import HandleOrder from './screens/HandleOrder';
import Footprint from './screens/Footprint';
import CommentForm from './screens/CommentForm';
import PurchaseHistory from './screens/PurchaseHistory';
import Preferences from './screens/Preferences';
import SalesStatus from './screens/SalesStatus';
import ProductInfo from './screens/ProductInfo';
import UserManagement from './screens/UserManagement';
import CustomerInfo from './screens/CustomerInfo';

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
          <Stack.Screen name="HandleOrder" component={HandleOrder} />
          <Stack.Screen name="Footprint" component={Footprint} />
          <Stack.Screen name="CommentForm" component={CommentForm} />
          <Stack.Screen name="PurchaseHistory" component={PurchaseHistory} />
          <Stack.Screen name="Preferences" component={Preferences} />
          <Stack.Screen name="SalesStatus" component={SalesStatus} />
          <Stack.Screen name="ProductInfo" component={ProductInfo} />
          <Stack.Screen name="UserManagement" component={UserManagement} />
          <Stack.Screen name="CustomerInfo" component={CustomerInfo} />
          {/* Add other screens here */}
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;