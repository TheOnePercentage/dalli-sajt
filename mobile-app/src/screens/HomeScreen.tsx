import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { Product } from '../types';
import { NavigationProp } from '@react-navigation/native';

interface HomeScreenProps {
  navigation: NavigationProp<any>;
}

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { colors } = useTheme();
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, isInWishlist } = useWishlistStore();

  const featuredProducts = [
    {
      id: 1,
      name: 'Osnovna Majica',
      price: 1290,
      salePrice: 1090,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      category: 'majice',
      badge: 'Bestseller',
    },
    {
      id: 2,
      name: 'Muški Duks',
      price: 4290,
      salePrice: 3490,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
      category: 'dukseri',
      badge: 'Sale',
    },
    {
      id: 3,
      name: 'Ženska Trenerka',
      price: 3890,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
      category: 'trenerke',
      badge: 'Novo',
    },
  ];

  const categories = [
    { id: 'muska', name: 'Muška Garderoba', icon: '👨', color: '#3b82f6', href: '/muska-garderoba.html' },
    { id: 'zenska', name: 'Ženska Garderoba', icon: '👩', color: '#ec4899', href: '/zenska-garderoba.html' },
    { id: 'dukseri', name: 'Duksevi', icon: '🧥', color: '#16a34a', href: '/dukseri.html' },
    { id: 'trenerke', name: 'Trenerke', icon: '🏃', color: '#f59e0b', href: '/trenerke.html' },
  ];

  const handleAddToCart = (product: any) => {
    // Add to cart logic
    console.log('Add to cart:', product.name);
  };

  const handleAddToWishlist = (product: any) => {
    // Wishlist logic
    console.log('Add to wishlist:', product.name);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Garderoba koja <Text style={styles.highlight}>traje</Text></Text>
          <Text style={styles.heroSubtitle}>
            100% organski pamuk. Precizni šavovi. Savršen fit. Bez loga na prsima — samo kvalitet koju osetite.
          </Text>
          <View style={styles.heroButtons}>
            <button style={styles.primaryButton} onPress={() => navigation.navigate('Products')}>
              <Text style={styles.buttonText}>Pogledaj Kolekciju</Text>
            </button>
            <button style={styles.secondaryButton} onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.secondaryButtonText}>Naši Favoriti</Text>
            </button>
          </View>
          <View style={styles.trustBadges}>
            {[
              { icon: '🚚', text: 'Brza dostava 1-3 dana' },
              { icon: '💳', text: 'Plaćanje pri preuzimanju' },
              { icon: '🔄', text: '30 dana za vraćanje' },
              { icon: '₿', text: '15% popust kripto' },
            ].map((item, i) => (
              <View key={i} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{item.icon}</Text>
                <Text style={styles.trustText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Category Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategorije Garderobe</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Category', { category: cat.id })}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                <Text style={styles.categoryIconText}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Naši Omiljeni Proizvodi</Text>
          <button style={styles.viewAllButton} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.viewAllText}>Svi Proizvodi</Text>
          </button>
        </View>
        <FlatList
          data={featuredProducts}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
            >
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productCategory}>{item.category}</Text>
                <Text style={styles.productName}>{item.name}</Text>
                <View style={styles.productPrice}>
                  {item.salePrice ? (
                    <>
                      <Text style={styles.salePrice}>{item.salePrice.toLocaleString('sr-RS')} RSD</Text>
                      <Text style={styles.oldPrice}>{item.price.toLocaleString('sr-RS')} RSD</Text>
                      <View style={styles.badge}>{item.badge}</View>
                    </>
                  ) : (
                    <Text style={styles.price}>{item.price.toLocaleString('sr-RS')} RSD</Text>
                  )}
                </View>
                <View style={styles.productActions}>
                  <button style={styles.addToCartBtn} onPress={() => handleAddToCart(item)}>
                    <Text style={styles.addToCartText}>Dodaj u korpu</Text>
                  </button>
                  <button style={styles.wishlistBtn} onPress={() => handleAddToWishlist(item)}>
                    <Text style={styles.wishlistText}>♡</Text>
                  </button>
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
        />
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Zašto DALLI?</Text>
        <View style={styles.featuresGrid}>
          {[
            { icon: '🚚', title: 'Besplatna Dostava', desc: 'Za porudžbine preko 5.000 RSD' },
            { icon: '💳', title: 'Plaćanje Pri Preuzimanju', desc: 'Platite kad dobijete paket' },
            { icon: '🔄', title: '30 Dana Za Vraćanje', desc: 'Rizik nulte. Vratite bez pitanja.' },
            { icon: '🧵', title: 'Kvalitet Prvo', desc: '100% organski pamuk, dvostruki ševovi' },
          ].map((item, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Newsletter */}
      <View style={styles.newsletterSection}>
        <Text style={styles.newsletterTitle}>Upišite se i uštedite 10%</Text>
        <Text style={styles.newsletterDesc}>Prvi saznajte za nove kolekcije, ekskluzivne popuste i promocije.</Text>
        <View style={styles.newsletterForm}>
          <input
            placeholder="Vaš email"
            style={styles.newsletterInput}
            placeholderTextColor="rgba(255,255,255,0.5)"
          />
          <button style={styles.newsletterButton}>
            <Text style={styles.newsletterButtonText}>Pretplati se</Text>
          </button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  hero: {
    padding: 24,
    marginBottom: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  highlight: {
    color: '#e74c3c',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
    lineHeight: 24,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 160,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 160,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  trustBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  trustIcon: {
    fontSize: 16,
  },
  trustText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  viewAllText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  categoryCard: {
    width: 160,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIconText: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryArrow: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  viewAllText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 14,
  },
  productGrid: {
    gap: 12,
    paddingHorizontal: 20,
  },
  productCard: {
    width: '48%',
    aspectRatio: 0.75,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#14141c',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 11,
    color: '#e74c3c',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  productPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  salePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  oldPrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  wishlistBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistText: {
    fontSize: 18,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#14141c',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  newsletterSection: {
    backgroundColor: '#1a1a2e',
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  newsletterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  newsletterDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  newsletterForm: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  newsletterInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  newsletterButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  newsletterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
