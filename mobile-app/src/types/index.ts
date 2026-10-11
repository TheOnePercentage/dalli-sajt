export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  currency: string;
  category: string;
  subcategory: string;
  gender: 'muski' | 'zenski' | 'unisex';
  description: string;
  shortDescription: string;
  images: {
    main: string;
    gallery: string[];
    ogImage?: string;
  };
  colors: Array<{
    name: string;
    hex: string;
    available: boolean;
  }>;
  sizes: Array<{
    size: string;
    available: boolean;
    stock: number;
  }>;
  rating: number;
  reviewCount: number;
  badge?: {
    type: string;
    text: string;
  };
  inStock: boolean;
  featured: boolean;
  bestseller: boolean;
  new: boolean;
}

export interface ProductVariant {
  id: string;
  color?: string;
  size?: string;
  price: number;
  salePrice?: number;
  stock: number;
}

export interface CartItem {
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

export interface ProductVariant {
  id: string;
  color?: string;
  size?: string;
  price: number;
  salePrice?: number;
  stock: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'admin' | 'vendor';
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: Address;
  billingAddress?: Address;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface CartItem {
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

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface AddressFormData {
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImage: string;
  price: number;
  salePrice?: number;
  quantity: number;
  variant?: {
    color?: string;
    size?: string;
    price: number;
    salePrice?: number;
    stock: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  image: string;
  productCount: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  image: string;
  productCount: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  image: string;
  productCount: number;
  isActive: boolean;
}

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  salePrice?: number;
  addedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  image: string;
  productCount: number;
  isActive: boolean;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y' | 'bundle';
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
  maxUses: number;
  usedCount: number;
  usagePerCustomer: number;
  startsAt: string;
  expiresAt: string | null;
  status: 'active' | 'inactive' | 'expired';
  restrictions: {
    categories: string[];
    products: string[];
    customerGroups: string[];
    firstTimeOnly: boolean;
    newCustomersOnly: boolean;
    excludeSaleItems: boolean;
  };
  stacking: {
    allowStacking: boolean;
    stackableWith: string[];
  };
  usage: {
    total: number;
    byCustomer: Record<string, number>;
  };
  createdAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: Address;
  billingAddress?: Address;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface CartItem {
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

export interface ProductVariant {
  id: string;
  color?: string;
  size?: string;
  price: number;
  salePrice?: number;
  stock: number;
}

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'crypto' | 'cash_on_delivery' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  cryptoDetails?: {
    currency: 'BTC' | 'ETH' | 'USDT' | 'USDC';
    address: string;
  };
}

export interface Notification {
  id: string;
  type: 'order' | 'promotion' | 'system' | 'review' | 'shipping';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  nameLocal: string;
  threshold: number;
  color: string;
  gradient: string;
  icon: string;
  benefits: string[];
  multiplier: number;
  welcomeBonus: number;
}

export interface LoyaltyState {
  tier: string;
  points: number;
  lifetimeEarned: number;
  history: Array<{
    points: number;
    source: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  tierProgress: number;
  nextTier?: string;
  pointsToNextTier: number;
}

export interface Achievement {
  id: string;
  name: string;
  nameLocal: string;
  description: string;
  icon: string;
  points: number;
  condition: (user: any) => boolean;
}

export interface AchievementProgress {
  id: string;
  achieved: boolean;
  progress: number;
  unlockedAt?: string;
}

export interface ReferralData {
  code: string;
  url: string;
  referrerReward: number;
  refereeDiscount: number;
  maxReferrals: number;
}

export interface ReferralState {
  code: string;
  url: string;
  referrals: Array<{
    id: string;
    refereeName: string;
    refereeEmail: string;
    status: 'pending' | 'completed';
    rewardClaimed: boolean;
    createdAt: string;
  }>;
  totalReferrals: number;
  totalRewards: number;
}

export interface Notification {
  id: string;
  type: 'order' | 'promotion' | 'system' | 'review' | 'shipping';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp: string;
}

export interface AnalyticsState {
  events: AnalyticsEvent[];
  userProperties: Record<string, any>;
  sessionId: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'bestselling' | 'rating';
  page: number;
  limit: number;
}

export interface SearchResults {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    categories: { name: string; count: number }[];
    colors: { name: string; count: number }[];
    sizes: { size: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
}

export interface SEOProduct {
  '@context': string;
  '@type': string;
  '@id': string;
  name: string;
  description: string;
  image: string[];
  sku: string;
  brand: {
    '@type': string;
    name: string;
  };
  offers: {
    '@type': string;
    price: number;
    priceCurrency: string;
    availability: string;
    seller: {
      '@type': string;
      name: string;
    };
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
    bestRating: number;
    worstRating: number;
  };
  review?: {
    '@type': string;
    author: {
      '@type': string;
      name: string;
    };
    reviewBody: string;
    reviewRating: {
      '@type': string;
      ratingValue: number;
      bestRating: number;
      worstRating: number;
    };
    datePublished: string;
  }[];
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
    bestRating: number;
    worstRating: number;
  };
}

export interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: 'website' | 'product' | 'article';
  siteName: string;
  locale: string;
  twitter?: {
    card: string;
    site: string;
    creator: string;
  };
}

export interface JSONLD {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface SEOData {
  title: string;
  description: string;
  canonical: string;
  og: OpenGraphData;
  twitter: {
    card: string;
    site: string;
    creator: string;
  };
  jsonLd: JSONLD[];
  robots: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  category?: string;
  subcategory?: string;
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  new?: boolean;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  filters?: FilterParams;
  pagination?: PaginationParams;
  sort?: SortParams;
}

export interface SearchResult {
  products: Product[];
  total: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    colors: Array<{ name: string; count: number }>;
    sizes: Array<{ size: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  city?: string;
  country?: string;
  region?: string;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  brand: string;
  systemVersion: string;
  deviceId: string;
  appVersion: string;
  buildNumber: string;
}

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  cdnUrl: string;
  analyticsId: string;
  sentryDsn?: string;
  featureFlags: Record<string, boolean>;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  forceUpdate: boolean;
  minVersion: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actions?: Array<{
    id: string;
    title: string;
    icon?: string;
  }>;
  categoryId?: string;
  threadId?: string;
  sound?: string;
  badge?: number;
}

export interface DeepLinkData {
  path: string;
  params: Record<string, any>;
  source: 'push' | 'universal' | 'custom' | 'qr';
}

export interface AppState {
  isLoading: boolean;
  isOnline: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  region: string;
  permissions: {
    notifications: boolean;
    location: boolean;
    camera: boolean;
    microphone: boolean;
    biometric: boolean;
  };
}

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  cdnUrl: string;
  analyticsId: string;
  sentryDsn?: string;
  featureFlags: Record<string, boolean>;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  forceUpdate: boolean;
  minVersion: string;
}