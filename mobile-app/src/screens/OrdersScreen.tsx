import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, FlatList, Image, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { Order, OrderItem } from '../../types';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface OrdersScreenProps {
  navigation: any;
}

export const OrdersScreen = ({ navigation }: OrdersScreenProps) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Mock data - in production, fetch from API
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrders([
        {
          id: 'ORD-2024001',
          orderNumber: 'ORD-2024001',
          items: [
            {
              id: '1',
              productId: '1',
              productName: 'Osnovna Majica',
              productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
              price: 1290,
              quantity: 2,
              variant: { color: 'Bela', size: 'M' }
            },
            {
              id: '2',
              productId: '3',
              productName: 'Ženska Trenerka',
              productImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
              price: 3890,
              quantity: 1,
              variant: { color: 'Roza', size: 'S' }
            }
          ],
          subtotal: 6470,
          shippingCost: 0,
          discount: 0,
          total: 6470,
          currency: 'RSD',
          status: 'delivered',
          paymentMethod: 'card',
          paymentStatus: 'paid',
          shippingAddress: {
            firstName: 'Marko',
            lastName: 'Petrović',
            address: 'Bulevar kralja Aleksandra 123',
            city: 'Beograd',
            postalCode: '11000',
            country: 'RS',
            phone: '+381 60 123 4567'
          },
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-18T14:20:00Z',
          trackingNumber: 'EE123456789RS',
          carrier: 'Pošta Srbije'
        },
        {
          id: 'ORD-2024002',
          orderNumber: 'ORD-2024002',
          items: [
            {
              id: '3',
              productId: '2',
              productName: 'Muški Duks',
              productImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
              price: 3490,
              salePrice: 3490,
              quantity: 1,
              variant: { color: 'Crna', size: 'L' }
            }
          ],
          subtotal: 3490,
          shippingCost: 290,
          discount: 0,
          total: 3780,
          currency: 'RSD',
          status: 'shipped',
          paymentMethod: 'crypto_btc',
          paymentStatus: 'paid',
          shippingAddress: {
            firstName: 'Marko',
            lastName: 'Petrović',
            address: 'Bulevar kralja Aleksandra 123',
            city: 'Beograd',
            postalCode: '11000',
            country: 'RS',
            phone: '+381 60 123 4567'
          },
          createdAt: '2024-01-20T14:20:00Z',
          updatedAt: '2024-01-22T10:15:00Z',
          trackingNumber: 'EE123456789RS',
          carrier: 'Pošta Srbije'
        }
      ]);
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: 'Na čekanju', color: '#f59e0b', icon: '⏳' },
      confirmed: { label: 'Potvrđena', color: '#3b82f6', icon: '✅' },
      processing: { label: 'U obradi', color: '#3b82f6', icon: '🔄' },
      shipped: { label: 'Poslata', color: '#8b5cf6', icon: '📦' },
      delivered: { label: 'Isporučena', color: '#16a34a', icon: '✅' },
      cancelled: { label: 'Otkazana', color: '#ef4444', icon: '❌' },
      refunded: { label: 'Vraćena', color: '#6b7280', icon: '↩️' },
    };
    return configs[status] || { label: status, color: '#6b7280', icon: '📦' };
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', { order: item })}>
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.color + '20', borderColor: statusConfig.color }
            ]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.icon} {statusConfig.label}
              </Text>
            </View>
          </View>
          <View style={styles.orderHeaderRight}>
            <Text style={styles.orderTotal}>{item.total.toLocaleString('sr-RS')} RSD</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.orderItems}>
          {item.items.slice(0, 2).map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Image
                source={{ uri: item.productImage }}
                style={styles.orderItemImage}
                resizeMode="cover"
              />
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={1}>{item.productName}</Text>
                {item.variant && (
                  <Text style={styles.orderItemVariant}>
                    {item.variant.color} / {item.variant.size}
                  </Text>
                )}
                <Text style={styles.orderItemPrice}>
                  {(item.salePrice || item.price).toLocaleString('sr-RS')} RSD × {item.quantity}
                </Text>
              </View>
            </View>
          ))}
            {item.items.length > 2 && (
              <Text style={styles.moreItems}>
                +{item.items.length - 2} više proizvoda
              </Text>
            )}
          </View>
          
          <View style={styles.orderFooter}>
            <View style={styles.orderFooterLeft}>
              <Text style={styles.orderItemsCount}>{item.items.length} proizvoda</Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.orderFooterRight}>
              <Text style={styles.orderTotal}>
                {item.total.toLocaleString('sr-RS')} RSD
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'delivered' ? '#16a34a20' : 
                  item.status === 'cancelled' ? '#ef444420' : '#f59e0b20' }
              ]}>
                <Text style={[
                  styles.statusTag,
                  { color: item.status === 'delivered' ? '#16a34a' : 
                    item.status === 'cancelled' ? '#ef4444' : '#f59e0b' }
                ]}>
                  {['pending','confirmed'].includes(item.status) ? '⏳' : 
                    item.status === 'delivered' ? '✅' : '❌'} 
                  {['pending','confirmed'].includes(item.status) ? ' U toku' : 
                    item.status === 'delivered' ? ' Isporučeno' : ' Otkazano'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e74c3c']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Nemate narudžbina</Text>
              <Text style={styles.emptySubtitle}>Počnite kupovinu i vaše narudžbine će se pojavljovati ovde</Text>
              <TouchableOpacity style={styles.startShoppingBtn} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.startShoppingText}>Počnite kupovinu</Text>
              </TouchableOpacity>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Moje narudžbine</Text>
              <Text style={styles.listHeaderSubtitle}>
                {orders.length} narudžbina{u(orders.length)}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0f',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 100,
    },
    listHeader: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    listHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },
    listHeaderSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 4,
    },
    orderCard: {
      backgroundColor: '#14141c',
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#2a2a3a',
      overflow: 'hidden',
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#2a2a3a',
    },
    orderHeaderLeft: {
      flex: 1,
    },
    orderHeaderRight: {
      alignItems: 'flex-end',
    },
    orderNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    orderHeaderRight: {
      alignItems: 'flex-end',
    },
    orderTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    orderDate: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
    },
    orderItems: {
      padding: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#2a2a3a',
    },
    orderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    orderItemImage: {
      width: 56,
      height: 56,
      borderRadius: 8,
      marginRight: 12,
    },
    orderItemInfo: {
      flex: 1,
    },
    orderItemName: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 2,
    },
    orderItemVariant: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 2,
    },
    orderItemPrice: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    moreItems: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 4,
      marginLeft: 68,
    },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#2a2a3a',
    },
    orderFooterLeft: {
      flex: 1,
    },
    orderFooterRight: {
      alignItems: 'flex-end',
    },
    orderItemsCount: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 2,
    },
    orderDate: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.4)',
    },
    orderFooterRight: {
      alignItems: 'flex-end',
    },
    orderTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 8,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusTag: {
      fontSize: 11,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
      textAlign: 'center',
      marginBottom: 24,
    },
    startShoppingBtn: {
      backgroundColor: '#e74c3c',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
    },
    startShoppingText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });