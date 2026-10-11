import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

interface WishlistState {
  items: WishlistItem[];
  addItem: (product: Product) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  itemCount: number;
}

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  salePrice?: number;
  addedAt: string;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      get itemCount() {
        return get().items.length;
      },

      addItem: async (product) => {
        const exists = get().items.some(item => item.productId === product.id);
        if (!exists) {
          set(state => ({
            items: [...state.items, {
              id: `${Date.now()}-${Math.random()}`,
              productId: product.id,
              productName: product.name,
              productImage: product.images?.main,
              price: product.price,
              salePrice: product.salePrice,
              addedAt: new Date().toISOString(),
            }]
          }));
        }
      },

      removeItem: async (productId: string) => {
        set(state => ({
          items: state.items.filter(item => item.productId !== productId),
        }));
      },

      clearWishlist: async () => {
        set({ items: [] });
      },

      isInWishlist: (productId: string) => {
        return get().items.some(item => item.productId === productId);
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
