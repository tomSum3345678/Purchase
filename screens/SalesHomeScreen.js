import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import SalesHeader from './SalesHeader';

const OrderScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Example data generator
  const generateOrders = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      orderNumber: `ORD-202310${String(i + 1).padStart(2, '0')}`,
      customer: `Customer ${i + 1}`,
      date: `2023-10-${String(Math.floor(i/5) + 1).padStart(2, '0')}`,
      total: Math.floor(Math.random() * 500) + 50,
      status: ['pending', 'shipped', 'completed', 'cancelled'][i % 4]
    }));
  };

  // Simulated API call
  const loadMoreOrders = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrders = generateOrders(20); // Simulate 20 total orders
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
    loadMoreOrders();
  }, []);

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #: {item.orderNumber}</Text>
        <Text style={[styles.statusLabel, 
          { backgroundColor: 
            item.status === 'pending' ? '#ffa726' : 
            item.status === 'shipped' ? '#42a5f5' : 
            item.status === 'completed' ? '#66bb6a' : '#ef5350'
          }]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      <Text style={styles.customerText}>Customer: {item.customer}</Text>
      <Text style={styles.dateText}>Date: {item.date}</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.totalText}>Total: ${item.total.toFixed(2)}</Text>
        <TouchableOpacity style={styles.detailButton}>
          <Text style={styles.detailButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading && !hasMore) return (
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>No more orders to load</Text>
      </View>
    );

    return isLoading ? (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#003366" />
        <Text style={styles.footerText}>Loading more orders...</Text>
      </View>
    ) : null;
  };

  return (
    <View style={styles.container}>
      <SalesHeader />
      {/* Navigation Bar */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>Order Management</Text>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search orders..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Status Filters */}
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

      {/* Order List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.2}
        contentContainerStyle={styles.listContent}
      />
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
    paddingBottom: 20,
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