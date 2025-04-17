import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import SalesHeader from './SalesHeader';
import AdminBar from './AdminBar';
import { supabase } from './supabaseClient';

const OrderScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [counts, setCounts] = useState({ unpaid: 0, pendingReview: 0 });

  // Status mappings
  const statusMap = {
    pending: '待处理',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
  };

  const paymentStatusMap = {
    null: '未付款',
    pending_review: '待审核',
    paid: '已付款',
  };

  // Fetch order counts for unpaid and pending_review
  const fetchOrderCounts = async () => {
    try {
      const { data: unpaidData, error: unpaidError } = await supabase
        .from('orders')
        .select('order_id', { count: 'exact' })
        .is('payment_status', null);

      if (unpaidError) throw unpaidError;

      const { data: pendingReviewData, error: pendingReviewError } = await supabase
        .from('orders')
        .select('order_id', { count: 'exact' })
        .eq('payment_status', 'pending_review');

      if (pendingReviewError) throw pendingReviewError;

      setCounts({
        unpaid: unpaidData.length,
        pendingReview: pendingReviewData.length,
      });
    } catch (error) {
      console.error('Error fetching order counts:', error.message || error);
    }
  };

  // Fetch orders from Supabase
  const loadMoreOrders = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      let query = supabase
        .from('orders')
        .select(`
          order_id,
          order_date,
          total_amount,
          status,
          payment_status,
          user_id,
          users!inner(username)
        `)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)
        .order('order_date', { ascending: false });

      // Apply filters
      if (selectedStatus !== 'all') {
        if (['pending', 'shipped', 'completed', 'cancelled'].includes(selectedStatus)) {
          query = query.eq('status', selectedStatus);
        } else if (selectedStatus === 'unpaid') {
          query = query.is('payment_status', null);
        } else if (selectedStatus === 'pending_review') {
          query = query.eq('payment_status', 'pending_review');
        } else if (selectedStatus === 'paid') {
          query = query.eq('payment_status', 'paid');
        }
      }

      // Apply search query
      if (searchQuery) {
        query = query.ilike('users.username', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data.length < itemsPerPage) {
        setHasMore(false);
      }

      setOrders(prev => [
        ...prev,
        ...data.map(order => ({
          id: order.order_id.toString(),
          orderNumber: `ORD-${order.order_id.toString().padStart(6, '0')}`,
          customer: order.users.username,
          date: new Date(order.order_date).toLocaleDateString('zh-CN'),
          total: order.total_amount,
          status: order.status,
          payment_status: order.payment_status,
        })),
      ]);
      setCurrentPage(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching orders:', error.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    // Reset and load initial orders
    setOrders([]);
    setCurrentPage(1);
    setHasMore(true);
    loadMoreOrders();
    fetchOrderCounts();
  }, [selectedStatus, searchQuery]);

  // Status filters
  const statusFilters = [
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待处理' },
    { id: 'shipped', label: '已发货' },
    { id: 'completed', label: '已完成' },
    { id: 'cancelled', label: '已取消' },
    { id: 'unpaid', label: `未付款 (${counts.unpaid})` },
    { id: 'pending_review', label: `待审核 (${counts.pendingReview})` },
    { id: 'paid', label: '已付款' },
  ];

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>订单号: {item.orderNumber}</Text>
        <Text
          style={[
            styles.statusLabel,
            {
              backgroundColor:
                item.status === 'pending'
                  ? '#ffa726'
                  : item.status === 'shipped'
                  ? '#42a5f5'
                  : item.status === 'completed'
                  ? '#66bb6a'
                  : '#ef5350',
            },
          ]}
        >
          {statusMap[item.status]}
        </Text>
      </View>
      <Text style={styles.customerText}>客户: {item.customer}</Text>
      <Text style={styles.dateText}>日期: {item.date}</Text>
      <Text style={styles.paymentStatusText}>
        付款状态: {paymentStatusMap[item.payment_status] || item.payment_status}
      </Text>
      <View style={styles.orderFooter}>
        <Text style={styles.totalText}>总计: ${item.total.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => navigation.navigate('HandleOrder', { orderId: item.id })}
        >
          <Text style={styles.detailButtonText}>查看详情</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading && !hasMore) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>没有更多订单可加载</Text>
        </View>
      );
    }

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
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>訂單管理</Text>
      </View>
      <View style={styles.countsContainer}>
        <Text style={styles.countsText}>未付款订单: {counts.unpaid}</Text>
        <Text style={styles.countsText}>待审核订单: {counts.pendingReview}</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="搜索客户名称..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <View style={styles.filterContainer}>
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterButton, selectedStatus === filter.id && styles.activeFilter]}
            onPress={() => setSelectedStatus(filter.id)}
          >
            <Text
              style={[styles.filterText, selectedStatus === filter.id && styles.activeFilterText]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
  countsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countsText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
    paddingBottom: 80,
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
    marginBottom: 4,
  },
  paymentStatusText: {
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