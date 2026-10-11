import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { Product } from '../../types';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface ProductDetailScreenProps {
  navigation: any;
  route: { params: { product: Product } };
}

export const ProductDetailScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, isInWishlist } = useWishlistStore();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedColor, setSelectedColor] = React.useState<string>('');
  const [selectedSize, setSelectedSize] = React.useState<string>('');
  const [showModal, setShowModal] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const { product } = route.params;

  const images = product.images?.gallery?.length > 0 
    ? [product.images.main, ...product.images.gallery] 
    : [product.images?.main || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'];

  const handleAddToCart = () => {
    const variant = {
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      color: selectedColor,
      size: selectedSize,
      price: product.salePrice || product.price,
      salePrice: product.salePrice,
      stock: product.sizes?.find(s => s.size === selectedSize)?.stock || 10,
    };
    addItem(route.params.product, quantity, variant);
    setShowModal(true);
  };

  const handleAddToWishlist = () => {
    // Add to wishlist logic
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sr-RS').format(price) + ' RSD';
  };

  const { width } = Dimensions.get('window');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Gallery */}
      <View style={styles.imageContainer}>
        <FlatList
          data={product.images?.gallery?.length > 0 
            ? [product.images.main, ...product.images.gallery] 
            : [product.images?.main || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400']}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Image
              source={{ uri: item }}
              style={styles.productImage}
              onLoad={() => setCurrentImageIndex(index)}
            />
          )}
          keyExtractor={(_, index) => index.toString()}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
            setCurrentImageIndex(index);
          }}
        />
        <View style={styles.imageIndicators}>
          {product.images?.gallery?.length > 0 
            ? [product.images.main, ...product.images.gallery].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.indicator,
                    i === currentImageIndex && styles.indicatorActive
                  ]}
                />
              ))
            : <View style={[styles.indicator, styles.indicatorActive]} />
          }
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.productName}>{product.name}</Text>
        
        <View style={styles.priceRow}>
          {product.salePrice ? (
            <>
              <Text style={styles.salePrice}>{product.salePrice.toLocaleString('sr-RS')} RSD</Text>
              <Text style={styles.oldPrice}>{product.price.toLocaleString('sr-RS')} RSD</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>-{Math.round((1 - product.salePrice / product.price) * 100)}%</Text>
              </View>
            </>
          ) : (
            <Text style={styles.price}>{product.price.toLocaleString('sr-RS')} RSD</Text>
          )}
          {product.rating && (
            <View style={styles.rating}>
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({product.reviewCount})</Text>
            </View>
          )}
        </View>

        <Text style={styles.description}>{product.shortDescription || product.description}</Text>

        {/* Color Selection */}
        {product.colors && product.colors.length > 0 && (
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>Boja</Text>
            <View style={styles.colorOptions}>
              {product.colors.map((color) => (
                <TouchableOpacity
                  key={color.name}
                  style={[
                    styles.colorOption,
                    selectedColor === color.name && styles.colorOptionSelected,
                    { backgroundColor: color.hex },
                  ]}
                  onPress={() => setSelectedColor(color.name)}
                  disabled={!color.available}
                >
                  {selectedColor === color.name && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Size Selection */}
        {product.sizes && product.sizes.length > 0 && (
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>Veličina</Text>
            <View style={styles.sizeOptions}>
              {product.sizes.map((size) => (
                <TouchableOpacity
                  key={size.size}
                  style={[
                    styles.sizeOption,
                    selectedSize === size.size && styles.sizeOptionSelected,
                    !size.available && styles.sizeOptionDisabled,
                  ]}
                  onPress={() => size.available && setSelectedSize(size.size)}
                  disabled={!size.available}
                >
                  <Text style={[
                    styles.sizeText,
                    selectedSize === size.size && styles.sizeTextSelected,
                    !size.available && styles.sizeTextDisabled,
                  ]}>
                    {size.size}
                  </Text>
                  {!size.available && <Text style={styles.outOfStock}>Nema na stanju</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Quantity Selector */}
        <View style={styles.quantitySelector}>
          <Text style={styles.sectionTitle}>Količina</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Text style={styles.quantityBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(quantity + 1)}
              disabled={quantity >= 10}
            >
              <Text style={styles.quantityBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Cena</Text>
            <Text style={styles.priceValue}>
              {product.salePrice 
                ? `${product.salePrice.toLocaleString('sr-RS')} RSD`
                : `${product.price.toLocaleString('sr-RS')} RSD`}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Količina</Text>
            <Text style={styles.priceValue}>{quantity} kom</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Ukupno</Text>
            <Text style={styles.totalPrice}>
              {(product.salePrice || product.price).toLocaleString('sr-RS')} RSD
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.wishlistButton} onPress={handleAddToWishlist}>
            <Ionicons name={isInWishlist(product.id) ? 'heart' : 'heart-outline'} size={24} color="#e74c3c" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart} activeOpacity={0.9}>
            <Text style={styles.addToCartText}>Dodaj u korpu</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🚚</Text>
            <Text style={styles.featureText}>Besplatna dostava {'>'} 5.000 RSD</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔄</Text>
            <Text style={styles.featureText}>30 dana za vraćanje</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💳</Text>
            <Text style={styles.featureText}>Plaćanje pri preuzimanju</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureText}>Sigurna kupovina</Text>
          </View>
        </View>
      </View>

      {/* Success Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true} onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>Dodato u korpu!</Text>
            <Text style={styles.modalText}>Proizvod je uspešno dodat u vašu korpu.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowModal(false)}>
                <Text style={styles.modalButtonTextSecondary}>Nastavi kupovinu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={() => { setShowModal(false); navigation.navigate('Cart'); }}>
                <Text style={styles.modalButtonTextPrimary}>Idi na korpu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  imageContainer: {
    width: '100%',
    height: 350,
    backgroundColor: '#14141c',
  },
  productImage: {
    width: '100%',
    height: 350,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  indicatorActive: {
    backgroundColor: '#e74c3c',
    width: 24,
  },
  productInfo: {
    padding: 20,
    backgroundColor: '#14141c',
  },
  category: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  salePrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  oldPrice: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  reviewCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 24,
  },
  selectionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    minWidth: 48,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    borderColor: '#e74c3c',
    borderWidth: 2,
    backgroundColor: 'rgba(231,76,60,0.1)',
  },
  sizeOptionDisabled: {
    opacity: 0.4,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sizeTextSelected: {
    color: '#e74c3c',
  },
  sizeTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  outOfStock: {
    fontSize: 10,
    color: '#ef4444',
    marginTop: 2,
  },
  quantitySelector: {
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    minWidth: 40,
    textAlign: 'center',
  },
  priceSummary: {
    backgroundColor: '#14141c',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    paddingTop: 12,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  wishlistButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderWidth: 1,
    borderColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  feature: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#14141c',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonTextSecondary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});