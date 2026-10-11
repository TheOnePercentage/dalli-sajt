import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, FlatList, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

interface PromotionsScreenProps {
  navigation: any;
}

export const PromotionsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [promotions, setPromotions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Mock data - in production, fetch from API
    setTimeout(() => {
      setPromotions([
        {
          id: 'promo1',
          code: 'WELCOME15',
          name: 'Dobrodošlica 15%',
          description: 'Popust od 15% na prvu porudžbinu',
          type: 'percentage',
          value: 15,
          maxDiscount: 5000,
          minOrderValue: 3000,
          maxUses: 1000,
          usedCount: 234,
          active: true,
          expiresAt: '2024-12-31',
        },
        {
          id: 'promo2',
          code: 'FREESHIP',
          name: 'Besplatna dostava',
          description: 'Besplatna dostava za sve porudžbine',
          type: 'free_shipping',
          value: 0,
          maxUses: 5000,
          usedCount: 1200,
          active: true,
          expiresAt: '2024-12-31',
        },
        {
          id: 'promo3',
          code: 'SUMMER20',
          name: 'Letnja akcija 20%',
          description: 'Popust od 20% na sve letnje proizvode',
          type: 'percentage',
          value: 20,
          maxDiscount: 10000,
          minOrderValue: 5000,
          maxUses: 500,
          usedCount: 89,
          active: true,
          expiresAt: '2024-08-31',
        },
        {
          id: 'promo4',
          code: 'BUNDLE25',
          name: 'Komplet 25% popusta',
          description: 'Kupite 3+ proizvoda i uštedite 25%',
          type: 'bundle',
          value: 25,
          maxUses: 200,
          usedCount: 45,
          active: true,
          expiresAt: '2024-09-15',
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleApplyPromo = (promo: any) => {
    // In real app, apply promo to cart
    Alert.alert('Uspeh', `Promo kod ${promo.code} je primenjen!`);
  };

  const handleSharePromo = (promo: any) => {
    // Share promo code
    // In real app, use Share API
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (active: boolean, expiresAt?: string) => {
    if (!active) return '#ef4444';
    if (expiresAt && new Date(expiresAt) < new Date()) return '#ef4444';
    return '#16a34a';
  };

  const getStatusText = (promo: any) => {
    if (!promo.active) return { text: 'Neaktivan', color: '#ef4444' };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { text: 'Istekao', color: '#ef4444' };
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return { text: 'Iskorišćen', color: '#f59e0b' };
    }
    return { text: 'Aktivan', color: '#16a34a' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Promocije i popusti</Text>
          <Text style={styles.headerSubtitle}>Aktivne ponude i promo kodovi</Text>
        </View>

        <FlatList
          data={promotions}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.promoCard} onPress={() => {}}>
              <View style={styles.promoHeader}>
                <View style={styles.promoHeaderLeft}>
                  <View style={[styles.promoBadge, { backgroundColor: item.type === 'percentage' ? '#3b82f6' : item.type === 'fixed' ? '#f59e0b' : item.type === 'free_shipping' ? '#16a34a' : '#8b5cf6' }]}>
                    <Text style={styles.promoBadgeText}>
                      {item.type === 'percentage' ? `${item.value}%` :
                        item.type === 'fixed' ? `${item.value} RSD` :
                        item.type === 'free_shipping' ? 'GRATIS' : `${item.value}%`}
                    </Text>
                  </View>
                  <View style={styles.promoHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item).color }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
                        {getStatusText(item).text}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

                <Text style={styles.promoCode}>{item.code}</Text>
                <Text style={styles.promoName}>{item.name}</Text>
                <Text style={styles.promoDescription}>{item.description}</Text>

                <View style={styles.promoDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tip</Text>
                    <Text style={styles.detailValue}>
                      {item.type === 'percentage' ? `${item.value}% popusta` :
                        item.type === 'fixed' ? `${item.value.toLocaleString('sr-RS')} RSD popusta` :
                        item.type === 'free_shipping' ? 'Besplatna dostava' : `${item.value}% popust na bundle`}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Min. porudžbina</Text>
                    <Text style={styles.detailValue}>{item.minOrderValue.toLocaleString('sr-RS')} RSD</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Maks. popust</Text>
                    <Text style={styles.detailValue}>{item.maxDiscount ? item.maxDiscount.toLocaleString('sr-RS') + ' RSD' : 'Bez ograničenja'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Iskorišćen</Text>
                    <Text style={styles.detailValue}>{item.usedCount} / {item.maxUses || '∞'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Važi do</Text>
                    <Text style={styles.detailValue}>
                      {item.expiresAt ? formatDate(item.expiresAt) : 'Bez isteka'}
                    </Text>
                  </View>

                  <View style={styles.promoActions}>
                    <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => {}}>
                      <Text style={styles.actionButtonTextSecondary}>Delite</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => handleApplyPromo(item)}>
                      <Text style={styles.actionButtonTextPrimary}>Koristi</Text>
                    </TouchableOpacity>
                  </View>
              </View>
            </TouchableOpacity>
          )}
        </FlatList>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  promoCard: {
    backgroundColor: '#14141c',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  promoHeaderLeft: {
    flex: 1,
  },
  promoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  promoHeaderRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  promoCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e74c3c',
    fontFamily: 'monospace',
    marginBottom: 4,
    letterSpacing: 1,
  },
  promoName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  promoDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    lineHeight: 20,
  },
  promoDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  promoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonTextSecondary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});