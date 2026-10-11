import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Order } from '../../types';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface OrderDetailScreenProps {
  navigation: any;
  route: { params: { order: any } };
}

export const OrderDetailScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
  const { order } = route.params;

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


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderTop}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>Narudžbina #{order.orderNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20', borderColor: statusConfig.color }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.icon} {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.orderHeaderRight}>
              <Text style={styles.orderTotal}>{order.total.toLocaleString('sr-RS')} RSD</Text>
              <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proizvodi</Text>
          <FlatList
            data={order.items}
            renderItem={({ item }) => (
              <View style={styles.orderItem} key={item.id}>
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
            )}
          />
          {order.items.length > 2 && (
            <Text style={styles.moreItems}>
              +{order.items.length - 2} više proizvoda
            </Text>
          )}
        </View>

        {/* Shipping Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresa dostave</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressName}>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</Text>
            <Text style={styles.addressLine}>{order.shippingAddress.address}</Text>
            {order.shippingAddress.apartment && <Text style={styles.addressLine}>{order.shippingAddress.apartment}</Text>}
            <Text style={styles.addressLine}>
              {order.shippingAddress.postalCode} {order.shippingAddress.city}
            </Text>
            <Text style={styles.addressLine}>
              {order.shippingAddress.country} • {order.shippingAddress.phone}
            </Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Način plaćanja</Text>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentLabel}>Način plaćanja</Text>
              <Text style={styles.paymentMethodText}>{getPaymentMethodLabel(order.paymentMethod)}</Text>
            </View>
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentLabel}>Status plaćanja</Text>
              <Text style={[
                styles.paymentStatusText,
                { color: order.paymentStatus === 'paid' ? '#16a34a' : order.paymentStatus === 'failed' ? '#ef4444' : '#f59e0b' }
              ]}>
                {getPaymentStatusLabel(order.paymentStatus)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping/Tracking */}
        {order.trackingNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Praćenje pošiljke</Text>
            <View style={styles.trackingCard}>
              <View style={styles.trackingHeader}>
                <Text style={styles.trackingLabel}>Broj za praćenje</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.copyText}>Kopiraj</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
              <View style={styles.trackingCarrier}>
                <Text style={styles.trackingLabel}>Prevoznik</Text>
                <Text style={styles.trackingCarrier}>{order.carrier || 'Pošta Srbije'}</Text>
              </View>
              <TouchableOpacity style={styles.trackButton} onPress={() => {}}>
                <Text style={styles.trackButtonText}>Prati pošiljku</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status narudžbine</Text>
          <View style={styles.timeline}>
            {[
              { status: 'confirmed', label: 'Potvrđena', time: order.createdAt, completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) },
              { status: 'processing', label: 'U obradi', time: order.updatedAt, completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
              { status: 'shipped', label: 'Poslata', time: order.updatedAt, completed: ['shipped', 'delivered'].includes(order.status) },
              { status: 'delivered', label: 'Isporučena', time: order.updatedAt, completed: order.status === 'delivered' },
            ].map((step, index) => (
              <View key={step.status} style={styles.timelineItem}>
                <View style={[
                  styles.timelineDot,
                  step.completed ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : { backgroundColor: 'transparent', borderColor: '#2a2a3a' }
                ]}>
                  {step.completed && <Text style={styles.timelineCheck}>✓</Text>}
                </View>
                <View style={index < 3 ? styles.timelineLine : {}} />
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineLabel,
                    step.completed ? { color: '#16a34a' } : { color: '#71717a' }
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={styles.timelineTime}>
                    {new Date(step.time).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => {}}>
              <Text style={styles.actionButtonTextSecondary}>Otkaži narudžbinu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => {}}>
              <Text style={styles.actionButtonTextPrimary}>Kontaktiraj podršku</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  orderHeader: {
    backgroundColor: '#14141c',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  orderHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  orderDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  paymentInfo: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trackingCard: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  copyText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    marginVertical: 12,
    fontFamily: 'monospace',
  },
  trackingCarrier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
  },
  trackingLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  trackingCarrier: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  trackButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  paymentInfo: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeline: {
    paddingLeft: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineCheck: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -24,
    width: 2,
    backgroundColor: '#2a2a3a',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonTextSecondary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});