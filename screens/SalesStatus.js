import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, FlatList, Alert, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Card, Button } from 'react-native-elements';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { supabase } from './supabaseClient';
import AdminBar from './AdminBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get('window').width;

// Category name mapping
const categoryNameMap = {
  'Mouhaap': '武俠',
  'Cooking': '烹飪',
  'Programming': '程式設計',
  'History': '歷史',
  'Autobiography': '自傳'
};

// Default placeholder image URL
const DEFAULT_IMAGE = 'https://via.placeholder.com/100x100.png?text=No+Image';

const SalesStatus = ({ navigation }) => {
  const [salesData, setSalesData] = useState([]);
  const [ratingsData, setRatingsData] = useState([]);
  const [topRatedProduct, setTopRatedProduct] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlySales, setMonthlySales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('武俠'); // Default to 武俠

  // Fetch years for filter
  const fetchYears = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_date')
        .order('order_date', { ascending: true });
      if (error) throw error;

      const uniqueYears = [...new Set(data.map(order => new Date(order.order_date).getFullYear()))];
      setYears(uniqueYears.map(year => year.toString()));
    } catch (error) {
      console.error('Error fetching years:', error.message);
      Alert.alert('錯誤', '無法加載年份數據，請稍後重試');
    }
  };

  // Fetch sales data
  const fetchSalesData = async () => {
    try {
      let query = supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          orders!inner(status, order_date),
          products!inner(
            product_name,
            category_id,
            image_data,
            categories!category_id(category_name)
          )
        `)
        .eq('orders.status', 'completed');

      if (selectedYear && selectedMonth) {
        const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
        const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
        query = query
          .gte('orders.order_date', startDate.toISOString())
          .lte('orders.order_date', endDate.toISOString());
      } else if (selectedYear) {
        const startDate = new Date(parseInt(selectedYear), 0, 1);
        const endDate = new Date(parseInt(selectedYear), 11, 31);
        query = query
          .gte('orders.order_date', startDate.toISOString())
          .lte('orders.order_date', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const aggregatedSales = data.reduce((acc, item) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            product_id: productId,
            product_name: item.products.product_name,
            category_name: categoryNameMap[item.products.categories.category_name] || item.products.categories.category_name,
            total_quantity: 0,
            total_amount: 0,
            image_data: item.products.image_data || DEFAULT_IMAGE, // Use default if no image
          };
        }
        acc[productId].total_quantity += item.quantity;
        acc[productId].total_amount += item.quantity * item.price;
        return acc;
      }, {});

      setSalesData(Object.values(aggregatedSales));
    } catch (error) {
      console.error('Error fetching sales data:', error.message);
      Alert.alert('錯誤', '無法加載銷售數據，請稍後重試');
    }
  };

  // Fetch ratings data
  const fetchRatingsData = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          product_id,
          rating,
          products!inner(
            product_name,
            category_id,
            categories!category_id(category_name)
          )
        `);

      if (error) throw error;

      const aggregatedRatings = data.reduce((acc, item) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            product_id: productId,
            product_name: item.products.product_name,
            category_name: categoryNameMap[item.products.categories.category_name] || item.products.categories.category_name,
            ratings: [],
            comment_count: 0,
          };
        }
        acc[productId].ratings.push(item.rating);
        acc[productId].comment_count += 1;
        return acc;
      }, {});

      const ratingsArray = Object.values(aggregatedRatings).map(item => ({
        ...item,
        average_rating: item.ratings.length > 0
          ? (item.ratings.reduce((sum, rating) => sum + rating, 0) / item.ratings.length).toFixed(1)
          : null,
      }));

      setRatingsData(ratingsArray);

      // Find top-rated product
      const topRated = ratingsArray
        .filter(item => item.average_rating)
        .sort((a, b) => b.average_rating - a.average_rating || b.comment_count - a.comment_count)[0];
      setTopRatedProduct(topRated || null);
    } catch (error) {
      console.error('Error fetching ratings data:', error.message);
      Alert.alert('錯誤', '無法加載評價數據，請稍後重試');
    }
  };

  // Fetch monthly sales for charts
  const fetchMonthlySales = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_date, total_amount')
        .eq('status', 'completed')
        .gte('order_date', `${selectedYear}-01-01`)
        .lte('order_date', `${selectedYear}-12-31`);

      if (error) throw error;

      const monthlyData = Array(12).fill(0).map((_, index) => ({
        month: index + 1,
        total_amount: 0,
      }));

      data.forEach(order => {
        const month = new Date(order.order_date).getMonth();
        monthlyData[month].total_amount += order.total_amount;
      });

      setMonthlySales(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly sales:', error.message);
      Alert.alert('錯誤', '無法加載月度銷售數據，請稍後重試');
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchYears(), fetchSalesData(), fetchRatingsData(), fetchMonthlySales()])
      .then(() => setIsLoading(false))
      .catch(error => {
        console.error('Error loading data:', error);
        setIsLoading(false);
      });
  }, [selectedYear, selectedMonth]);

  // Reset month when year changes
  useEffect(() => {
    setSelectedMonth('');
  }, [selectedYear]);

  // Check admin access using AsyncStorage
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const email = await AsyncStorage.getItem('isLoggedIn');
        const role = await AsyncStorage.getItem('loginRole');
        console.log('AsyncStorage check:', { email, role }); // Debug log

        if (!email || !role) {
          Alert.alert('未登錄', '請先登錄以查看銷售情況');
          navigation.navigate('Login');
          return;
        }

        if (role !== 'admin') {
          Alert.alert('無權限', '僅管理員可查看銷售情況');
          navigation.goBack();
          return;
        }

        // Verify user exists in users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (userError || !userData || userData.role !== 'admin') {
          console.error('User verification failed:', userError?.message);
          Alert.alert('無權限', '僅管理員可查看銷售情況');
          navigation.goBack();
          return;
        }
      } catch (error) {
        console.error('Error checking admin access:', error.message);
        Alert.alert('錯誤', '無法驗證權限，請重新登錄');
        navigation.navigate('Login');
      }
    };
    checkAdmin();
  }, [navigation]);

  // Filter sales data by selected category
  const filteredSalesData = salesData.filter(item => item.category_name === selectedCategory);

  // Render sales and ratings card
  const renderProductCard = ({ item }) => {
    const rating = ratingsData.find(r => r.product_id === item.product_id);
    return (
      <Card containerStyle={styles.card}>
        <View style={styles.cardContent}>
          <Image
            source={{ uri: item.image_data }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => console.log(`Failed to load image for ${item.product_name}`)}
          />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{item.product_name}</Text>
            <Text style={styles.cardSubtitle}>分類: {item.category_name}</Text>
            <Text style={styles.cardText}>銷售數量: {item.total_quantity}</Text>
            <Text style={styles.cardText}>總銷售額: HK${item.total_amount.toFixed(2)}</Text>
            <Text style={styles.cardText}>
              平均評分: {rating && rating.average_rating ? `${rating.average_rating}/5 (${rating.comment_count} 條評價)` : '沒有任何評分'}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Chart data for monthly sales
  const chartData = {
    labels: monthlySales.map(m => `${m.month}月`),
    datasets: [
      {
        data: monthlySales.map(m => m.total_amount),
        color: (opacity = 1) => `rgba(0, 51, 102, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Bar chart data by category
  const barChartData = {
    labels: [...new Set(salesData.map(item => categoryNameMap[item.category_name] || item.category_name))],
    datasets: [
      {
        data: [...new Set(salesData.map(item => categoryNameMap[item.category_name] || item.category_name))].map(category =>
          salesData
            .filter(item => (categoryNameMap[item.category_name] || item.category_name) === category)
            .reduce((sum, item) => sum + item.total_amount, 0)
        ),
      },
    ],
  };

  // Header component for FlatList
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>銷售情況概覽</Text>
      </View>

      {/* Year and Month Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedYear}
            onValueChange={value => setSelectedYear(value)}
            style={styles.picker}
          >
            <Picker.Item label="選擇年份" value="" />
            {years.map(year => (
              <Picker.Item key={year} label={year} value={year} />
            ))}
          </Picker>
        </View>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={value => setSelectedMonth(value)}
            style={styles.picker}
            enabled={!!selectedYear}
          >
            <Picker.Item label="選擇月份" value="" />
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <Picker.Item key={month} label={`${month}月`} value={month.toString()} />
            ))}
          </Picker>
        </View>
        <Button
          title="清除過濾"
          onPress={() => {
            setSelectedYear(new Date().getFullYear().toString());
            setSelectedMonth('');
          }}
          buttonStyle={styles.clearButton}
          titleStyle={styles.clearButtonText}
        />
      </View>

      {/* Top Rated Product */}
      <Card containerStyle={styles.topRatedCard}>
        <Text style={styles.sectionTitle}>最受歡迎商品</Text>
        {topRatedProduct ? (
          <>
            <Text style={styles.topRatedText}>{topRatedProduct.product_name}</Text>
            <Text style={styles.topRatedSubtitle}>分類: {topRatedProduct.category_name}</Text>
            <Text style={styles.topRatedSubtitle}>
              平均評分: {topRatedProduct.average_rating}/5 ({topRatedProduct.comment_count} 條評價)
            </Text>
          </>
        ) : (
          <Text style={styles.topRatedText}>暫無評價數據</Text>
        )}
      </Card>

      {/* Monthly Sales Chart */}
      <Card containerStyle={styles.chartCard}>
        <Text style={styles.sectionTitle}>年度銷售趨勢 ({selectedYear})</Text>
        {monthlySales.some(m => m.total_amount > 0) ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f0f4f8',
              backgroundGradientTo: '#e1e1ee',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0, 51, 102, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '6', strokeWidth: '2', stroke: '#003366' },
              formatYLabel: value => `HK$${parseFloat(value).toFixed(2)}`,
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyText}>無銷售數據</Text>
        )}
      </Card>

      {/* Sales by Category */}
      <Card containerStyle={styles.chartCard}>
        <Text style={styles.sectionTitle}>分類銷售額</Text>
        {salesData.length > 0 ? (
          <BarChart
            data={barChartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f0f4f8',
              backgroundGradientTo: '#e1e1ee',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              formatYLabel: value => `HK$${parseFloat(value).toFixed(2)}`,
            }}
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyText}>無銷售數據</Text>
        )}
      </Card>

      {/* Product Sales List Header */}
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>商品銷售與評價</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={value => setSelectedCategory(value)}
            style={styles.picker}
          >
            {Object.values(categoryNameMap).map(category => (
              <Picker.Item key={category} label={category} value={category} />
            ))}
          </Picker>
        </View>
      </Card>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>正在加載數據...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSalesData.length > 0 ? filteredSalesData : [{ id: 'empty', isEmpty: true }]}
        renderItem={({ item }) => {
          if (item.isEmpty) {
            return (
              <Card containerStyle={styles.card}>
                <Text style={styles.emptyText}>無銷售數據</Text>
              </Card>
            );
          }
          return renderProductCard({ item });
        }}
        keyExtractor={item => (item.isEmpty ? 'empty' : item.product_id.toString())}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.scrollContent}
      />
      <AdminBar navigation={navigation} activeScreen="SalesStatus" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollContent: {
    paddingBottom: 80, // Space for AdminBar
  },
  header: {
    backgroundColor: '#003366',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  clearButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 10,
    margin: 10,
    padding: 10, // Increased padding to accommodate image
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row', // Layout image and text side by side
    alignItems: 'center',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f0f0f0', // Placeholder background
  },
  cardTextContainer: {
    flex: 1,
  },
  topRatedCard: {
    borderRadius: 10,
    margin: 10,
    padding: 15,
    backgroundColor: '#e6f3ff',
  },
  chartCard: {
    borderRadius: 10,
    margin: 10,
    padding: 15,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  topRatedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#003366',
    marginBottom: 5,
  },
  topRatedSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

export default SalesStatus;