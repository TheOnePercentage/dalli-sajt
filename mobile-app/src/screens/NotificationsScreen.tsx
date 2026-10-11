import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Notification } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Mock data - in production, fetch from API
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications([
        {
          id: '1',
          type: 'order',
          title: 'Narudžbina potvrđena',
          message: 'Vaša narudžbina #ORD-2024001 je potvrđena i stavljena u obradu.',
          read: false,
          data: { orderId: 'ORD-2024001' },
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          type: 'shipping',
          title: 'Pošiljka posla',
          message: 'Vaša pošiljka #ORD-2024001 je poslata. Broj za praćenje: EE123456789RS',
          read: false,
          data: { orderId: 'ORD-2024001', trackingNumber: 'EE123456789RS' },
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: '3',
          type: 'promotion',
          title: 'Ekskluzivna ponuda!',
          message: 'Samo za vas: 20% popust na sve dukseve do nedelje. Koristite kod VIP20.',
          read: true,
          data: { promoCode: 'VIP20' },
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '4',
          type: 'review',
          title: 'Nova recenzija',
          message: 'Neko je ostavio recenziju na vaš proizvod "Osnovna Majica". Ocena: 5/5',
          read: true,
          data: { productId: '1' },
          createdAt: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: '5',
          type: 'system',
          title: 'Ažuriranje aplikacije',
          message: 'Nova verzija 1.1.0 je dostupna. Nova funkcija: Dark mode!',
          read: false,
          createdAt: new Date(Date.now() - 259200000).toISOString()
        }
      ]);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    fetchNotifications();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return '📦';
      case 'shipping': return '📦';
      case 'promotion': return '🎁';
      case 'review': return '⭐';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Upravo sada';
    if (minutes < 60) return `pre ${minutes} min`;
    if (hours < 24) return `pre ${hours} h`;
    return `pre ${days} dana`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#e74c3c']}
        />
      }>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Obaveštenja</Text>
          </View>
          <TouchableOpacity style={styles.markAllReadBtn} onPress={markAllAsRead}>
            <Text style={styles.markAllReadText}>Označi sve kao pročitano</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={notifications}
          renderItem={({ item }) => {
            const icon = getTypeIcon(item.type);
            return (
              <TouchableOpacity
                style={[
                  styles.notificationItem,
                  !item.read && styles.notificationUnread
                ]}
                onPress={() => {
                  markAsRead(item.id);
                  // Navigate based on type
                  if (item.data?.orderId) {
                    // navigation.navigate('OrderDetail', { orderId: item.data.orderId });
                  } else if (item.data?.productId) {
                    // navigation.navigate('ProductDetail', { productId: item.data.productId });
                  } else if (item.data?.promoCode) {
                    // navigation.navigate('Promotions');
                  }
                }}
              >
                <View style={styles.notificationIconContainer}>
                  <Text style={styles.notificationIcon}>{getTypeIcon(item.type)}</Text>
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationTime}>{getTimeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e74c3c']}
              progressViewOffset={-20}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Nema obaveštenja</Text>
              <Text style={styles.emptySubtitle}>Kad ih primite, ovde će se pojaviti</Text>
            </View>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  markAllReadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 8,
  },
  markAllReadText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  notificationItem: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    flexDirection: 'row',
    gap: 12,
  },
  notificationUnread: {
    backgroundColor: 'rgba(231,76,60,0.05)',
    borderColor: 'rgba(231,76,60,0.3)',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(231,76,60,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    marginLeft: 8,
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
  },
});