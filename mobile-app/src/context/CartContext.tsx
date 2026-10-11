import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product, ProductVariant } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => Promise<void>;
  updateQuantity: (productId: string, variantId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ valid: boolean; discount?: number; message?: string }>;
  appliedPromoCode: string | null;
  discount: number;
  shippingCost: number;
  total: number;
}

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImage: string;
  price: number;
  salePrice?: number;
  quantity: number;
  variant?: ProductVariant;
}

interface ProductVariant {
  id: string;
  color?: string;
  size?: string;
  price: number;
  salePrice?: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  currency: string;
  category: string;
  subcategory: string;
  gender: string;
  description: string;
  shortDescription: string;
  images: {
    main: string;
    gallery: string[];
    ogImage?: string;
  };
  colors: { name: string; hex: string; available: boolean }[];
  sizes: { size: string; available: boolean; stock: number }[];
  rating: number;
  reviewCount: number;
  badge?: { type: string; text: string };
  inStock: boolean;
  featured: boolean;
  bestseller: boolean;
  new: boolean;
}

const CartContext = React.createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = '@dalli_cart';

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [appliedPromoCode, setAppliedPromoCode] = React.useState<string | null>(null);
  const [discount, setDiscount] = React.useState(0);
  const [shippingCost, setShippingCost] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadCart();
  }, []);

  const loadCart = React.useCallback(async () => {
    try {
      const savedCart = await AsyncStorage.getItem('@dalli_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.items || []);
        setAppliedPromoCode(parsed.promoCode || null);
        setDiscount(parsed.discount || 0);
        setShippingCost(parsed.shippingCost || 0);
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCart = React.useCallback(async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify({
        items,
        promoCode: appliedPromoCode,
        discount,
        shippingCost,
      }));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [items, appliedPromoCode, discount, shippingCost]);

  const addItem = React.useCallback(async (product: any, quantity = 1, variant?: any) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.productId === product.id && item.variantId === variant?.id
      );

      let newItems;
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
        };
        return newItems;
      } else {
        return [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          productId: product.id,
          variantId: variant?.id,
          productName: product.name,
          productImage: product.images?.main,
          price: variant?.price || product.price,
          salePrice: variant?.salePrice || product.salePrice,
          quantity,
          variant,
        }];
      }
    });
    saveCart();
  }, []);

  const removeItem = React.useCallback(async (productId: string, variantId?: string) => {
    setItems(prev => prev.filter(item => !(item.productId === productId && item.variantId === variantId)));
    saveCart();
  }, []);

  const updateQuantity = async (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }

    setItems(prev => prev.map(item =>
      item.productId === productId && item.variantId === variantId
        ? { ...item, quantity }
        : item
    ));
    await saveCart();
  };

  const clearCart = async () => {
    setItems([]);
    setAppliedPromoCode(null);
    setDiscount(0);
    setShippingCost(0);
    await AsyncStorage.removeItem('cart');
  };

  const applyPromoCode = async (code: string) => {
    // In production, call API to validate promo code
    // Mock implementation
    if (code === 'WELCOME10') {
      setAppliedPromoCode(code);
      setDiscount(10);
      await saveCart();
      return { valid: true, discount: 10, message: '10% discount applied!' };
    }
    if (code === 'WELCOME15') {
      setAppliedPromoCode(code);
      setDiscount(15);
      await saveCart();
      return { valid: true, discount: 15, message: '15% discount applied!' };
    }
    if (code === 'FREESHIP') {
      setAppliedPromoCode(code);
      setShippingCost(0);
      await saveCart();
      return { valid: true, discount: 0, message: 'Free shipping applied!' };
    }
    return { valid: false, message: 'Invalid promo code' };
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount + shippingCost;

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    itemCount,
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyPromoCode,
    appliedPromoCode,
    discount,
    shippingCost,
    total: subtotal - (subtotal * discount / 100) + shippingCost,
  };

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      applyPromoCode,
      appliedPromoCode,
      discount,
      shippingCost,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) - (items.reduce((sum, item) => sum + item.price * item.quantity, 0) * discount / 100) + shippingCost,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};