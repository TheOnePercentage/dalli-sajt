import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { immer } from 'zustand/middleware/immer';
import { Product } from '../types';

interface CartState {
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


export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedPromoCode: null,
      discount: 0,
      shippingCost: 0,

      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      get subtotal() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      get total() {
        const subtotal = get().subtotal;
        const discount = get().discount;
        const shippingCost = get().shippingCost;
        const discountAmount = get().subtotal * (get().discount / 100);
        return subtotal - discountAmount + get().shippingCost;
      },

      addItem: async (product, quantity = 1, variant) => {
        const { items } = get();
        const variantId = variant?.id;
        const existingIndex = get().items.findIndex(
          item => item.productId === product.id && item.variantId === variantId
        );

        if (existingIndex >= 0) {
          set(state => {
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + quantity,
            };
            return { items: newItems };
          });
        } else {
          const newItem: CartItem = {
            id: `${Date.now()}-${Math.random()}`,
            productId: product.id,
            variantId: variant?.id,
            productName: product.name,
            productImage: product.images?.main,
            price: variant?.price || product.price,
            salePrice: variant?.salePrice || product.salePrice,
            quantity,
            variant,
          };
          set(state => ({ items: [...state.items, newItem] }));
        }
      },

      removeItem: async (productId: string, variantId?: string) => {
        set(state => ({
          items: state.items.filter(item => !(item.productId === productId && item.variantId === variantId)),
        }));
      },

      updateQuantity: async (productId: string, variantId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        set(state => ({
          items: state.items.map(item =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: async () => {
        set({ items: [], appliedPromoCode: null, discount: 0, shippingCost: 0 });
      },

      applyPromoCode: async (code: string) => {
        // Mock implementation - in production call API
        if (code === 'WELCOME10') {
          return { valid: true, discount: 10, message: '10% discount applied!' };
        }
        if (code === 'WELCOME15') {
          return { valid: true, discount: 15, message: '15% discount applied!' };
        }
        if (code === 'FREESHIP') {
          return { valid: true, discount: 0, message: 'Free shipping applied!' };
        }
        return { valid: false, message: 'Invalid promo code' };
      },

      setAppliedPromoCode: (code: string | null) => set({ appliedPromoCode: code }),
      setDiscount: (discount: number) => set({ discount }),
      setShippingCost: (cost: number) => set({ shippingCost: cost }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        items: state.items,
        appliedPromoCode: state.appliedPromoCode,
        discount: state.discount,
        shippingCost: state.shippingCost,
      }),
    }
  )
);
