import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import SalesHeader from './SalesHeader';
import AdminBar from './AdminBar';

const OrderScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 状态映射：英文（数据库）到中文（显示）
  const statusMap = {
    'pending': '待处理',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  };

  // 示例数据生成器（模拟数据库数据，保持英文状态）
  const generateOrders = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      orderNumber: `ORD-202310${String(i + 1).padStart(2, '0')}`,
      customer: `客户 ${i + 1}`,
      date: `2023-10-${String(Math.floor(i/5) + 1).padStart(2, '0')}`,
      total: Math.floor(Math.random() * 500) + 50,
      status: ['pending', 'shipped', 'completed', 'cancelled'][i % 4] // 英文状态，与数据库一致
    }));
  };

  // 模拟API调用
  const loadMoreOrders = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrders = generateOrders(20);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = newOrders.slice(startIndex, startIndex + itemsPerPage);
    
    if (paginatedOrders.length === 0) {
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    setOrders(prev => [...prev, ...paginatedOrders]);
    setCurrentPage(prev => prev + 1);
    setIsLoading(false);
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    // 初始加载订单
    loadMoreOrders();
  }, [navigation]);

  // 状态筛选器（英文ID用于逻辑，中文label用于显示）
  const statusFilters = [
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待处理' },
    { id: 'shipped', label: '已发货' },
    { id: 'completed', label: '已完成' },
    { id: 'cancelled', label: '已取消' }
  ];

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>订单号: {item.orderNumber}</Text>
        <Text style={[styles.statusLabel, 
          { backgroundColor: 
            item.status === 'pending' ? '#ffa726' : 
            item.status === 'shipped' ? '#42a5f5' : 
            item.status === 'completed' ? '#66bb6a' : '#ef5350'
          }]}>
          {statusMap[item.status]} {/* 显示中文状态 */}
        </Text>
      </View>
      <Text style={styles.customerText}>客户: {item.customer}</Text>
      <Text style={styles.dateText}>日期: {item.date}</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.totalText}>总计: ${item.total.toFixed(2)}</Text>
        <TouchableOpacity style={styles.detailButton}>
          <Text style={styles.detailButtonText}>查看详情</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading && !hasMore) return (
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>没有更多订单可加载</Text>
      </View>
    );

    return isLoading ? (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#003366" />
        <Text style={styles.footerText}>正在加载更多订单...</Text>
      </View>
    ) : null;
  };

  return (
    <View style={styles.container}>
      <SalesHeader />
      {/* 导航栏 */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>訂單管理</Text>
      </View>

      {/* 搜索栏 */}
      <TextInput
        style={styles.searchInput}
        placeholder="搜索订单..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* 状态筛选 */}
      <View style={styles.filterContainer}>
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedStatus === filter.id && styles.activeFilter
            ]}
            onPress={() => setSelectedStatus(filter.id)}
          >
            <Text style={[
              styles.filterText,
              selectedStatus === filter.id && styles.activeFilterText
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 订单列表 */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>未找到订单</Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.2}
        contentContainerStyle={styles.listContent}
      />

      <AdminBar navigation={navigation} activeScreen="SalesHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e1e1ee',
  },
  navbar: {
    backgroundColor: '#003366',
    padding: 15,
    alignItems: 'center',
  },
  navTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
  activeFilter: {
    backgroundColor: '#003366',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // 避免与AdminBar重叠
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusLabel: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
  },
  customerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
  },
  detailButton: {
    backgroundColor: '#003366',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  detailButtonText: {
    color: 'white',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  footerContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#666',
    marginTop: 5,
  },
});

export default OrderScreen;