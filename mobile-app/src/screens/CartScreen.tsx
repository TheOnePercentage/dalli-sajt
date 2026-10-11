import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, FlatList, Alert, TextInput } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { NavigationProp } from '@react-navigation/native';

interface CartScreenProps {
  navigation: NavigationProp<any>;
}

export const CartScreen = ({ navigation }: CartScreenProps) => {
  const { colors } = useTheme();
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart, appliedPromoCode, discount, shippingCost, total, applyPromoCode } = useCartStore();
  const { isInWishlist, addItem: addToWishlist } = useWishlistStore();

  const [promoCode, setPromoCode] = React.useState('');

  const handleUpdateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    const item = useCartStore.getState().items.find(i => i.productId === productId && i.variantId === variantId);
    if (item) {
      const newQuantity = item.quantity + (delta > 0 ? 1 : -1);
      if (newQuantity > 0) {
        // updateQuantity(productId, variantId, newQuantity);
      } else {
        // removeItem(productId, variantId);
      }
    }
  };

  const handleCheckout = () => {
    if (itemCount === 0) return;
    navigation.navigate('Checkout');
  };

  const handlePromoCode = async () => {
    // In a real app, show a modal to enter promo code
    Alert.alert('Promo kod', 'Unesite promo kod', [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Primeni',
        onPress: () => {
          // In a real app, you would call applyPromoCode here
        }
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.cartItem} onPress={() => navigation.navigate('ProductDetail', { product: { id: item.productId } })}>
      <Image source={{ uri: item.productImage }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
        {item.variant && (
          <Text style={styles.itemVariant}>
            {item.variant.color} / {item.variant.size}
          </Text>
        )}
        <View style={styles.itemPriceRow}>
          <Text style={styles.itemPrice}>
            {(item.salePrice || item.price).toLocaleString('sr-RS')} RSD
          </Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity onPress={() => handleUpdateQuantity(item.productId, item.variantId, -1)} style={styles.qtyButton}>
              <Text style={styles.qtyButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => handleUpdateQuantity(item.productId, item.variantId, 1)} style={styles.qtyButton}>
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.itemTotal}>
            {(item.salePrice || item.price) * item.quantity} RSD
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.productId, item.variantId)}>
        <Text style={styles.removeText}>Ukloni</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>🛒</Text>
        </View>
        <Text style={styles.emptyTitle}>Vaša korpa je prazna</Text>
        <Text style={styles.emptySubtitle}>Dodajte proizvode koje volite</Text>
        <TouchableOpacity style={styles.continueShoppingBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.continueShoppingText}>Nastavite kupovinu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Korpa ({itemCount})</Text>
        {itemCount > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
            <Text style={styles.clearButtonText}>Očisti korpu</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>Vaša korpa je prazna</Text>
            <Text style={styles.emptySubtitle}>Dodajte proizvode koje volite</Text>
            <TouchableOpacity style={styles.continueShoppingBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.continueShoppingText}>Nastavite kupovinu</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {items.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.promoSection}>
            <Text style={styles.promoLabel}>Imate promo kod?</Text>
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Unesite promo kod"
                onChangeText={setPromoCode}
                value={promoCode}
              />
              <TouchableOpacity style={styles.applyPromoBtn} onPress={() => applyPromoCode(promoCode)}>
                <Text style={styles.applyPromoText}>Primeni</Text>
              </TouchableOpacity>
            </View>
            {appliedPromoCode && (
              <View style={styles.appliedPromo}>
                <Text style={styles.appliedPromoText}>Primijenjen: {appliedPromoCode} ({discount}% popust)</Text>
                <TouchableOpacity onPress={() => { setAppliedPromoCode(null); setDiscount(0); }}>
                  <Text style={styles.removePromoText}>Ukloni</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ukupno ({itemCount} stavki)</Text>
            <Text style={styles.summaryValue}>{subtotal.toLocaleString('sr-RS')} RSD</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Popust ({discount}%)</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-{(subtotal * discount / 100).toLocaleString('sr-RS')} RSD</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dostava</Text>
            <Text style={styles.summaryValue}>{shippingCost === 0 ? 'Besplatno' : shippingCost.toLocaleString('sr-RS') + ' RSD'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Ukupno za plaćanje</Text>
            <Text style={styles.totalValue}>{total.toLocaleString('sr-RS')} RSD</Text>
          </View>

          <TouchableOpacity style={[styles.checkoutBtn, itemCount === 0 && styles.checkoutDisabled]} onPress={handleCheckout} disabled={itemCount === 0}>
            <Text style={styles.checkoutBtnText}>
              Nastavite na čekaut ({total.toLocaleString('sr-RS')} RSD)
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemVariant: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    minWidth: 80,
    textAlign: 'right',
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
  },
  removeText: {
    color: '#ef4444',
    fontSize: 12,
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
  continueShoppingBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#14141c',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  promoSection: {
    marginBottom: 16,
  },
  promoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  applyPromoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyPromoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedPromo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.3)',
  },
  appliedPromoText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  removePromoText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  discountValue: {
    color: '#ef4444',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e74c3c',
  },
  checkoutBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutDisabled: {
    backgroundColor: '#3a3a4a',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  continueShoppingBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});