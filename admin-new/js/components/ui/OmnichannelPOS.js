/**
 * DALLI Omnichannel / POS System
 * BOPIS (Buy Online Pickup In-Store), Ship-from-Store, Unified Customer Profiles
 * Store Locator, Inventory Sync, Unified Loyalty
 */

export class OmnichannelPOS {
  static init() {
    this.initBOPIS();
    this.initShipFromStore();
    this.initUnifiedProfiles();
    this.initStoreLocator();
    this.initInventorySync();
    this.initPOSInterface();
    this.initUnifiedLoyalty();
    this.initStoreManagement();
  }

  // ============================================================
  // BOPIS (BUY ONLINE PICKUP IN STORE)
  // ============================================================
  static initBOPIS() {
    this.bopisOrders = new Map();
    this.pickupLocations = new Map();
  }

  static async createBOPISOrder(data) {
    const { orderId, customerId, storeId, items, pickupWindow, contactInfo } = data;

    // Validate store inventory
    const inventoryCheck = await this.checkStoreInventory(storeId, items);
    if (!inventoryCheck.available) {
      return { success: false, error: 'Insufficient inventory at selected store', unavailable: inventoryCheck.unavailable };
    }

    // Reserve inventory
    await this.reserveInventory(storeId, items);

    const bopisOrder = {
      id: this.generateBOPISId(),
      orderId,
      customerId,
      storeId,
      items,
      pickupWindow: {
        start: pickupWindow.start,
        end: pickupWindow.end
      },
      contactInfo,
      status: 'ready_for_pickup',
      pickupCode: this.generatePickupCode(),
      qrCode: this.generateQRCode(data.orderId),
      statusHistory: [
        { status: 'placed', timestamp: new Date().toISOString() },
        { status: 'confirmed', timestamp: new Date().toISOString() },
        { status: 'ready_for_pickup', timestamp: new Date().toISOString() }
      ],
      notifications: {
        confirmationSent: true,
        readySent: false,
        reminderSent: false,
        pickedUp: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.bopisOrders.set(bopisOrder.id, bopisOrder);

    // Reserve inventory at store
    await this.reserveInventory(data.storeId, data.items);

    // Send confirmation
    this.sendPickupConfirmation(data.customerId, bopisOrder);

    // Notify store
    this.notifyStoreForPickup(bopisOrder);

    return { success: true, bopisOrder };
  }

  static async checkStoreInventory(storeId, items) {
    // In production, query store inventory system
    // Mock implementation
    const unavailable = [];
    for (const item of items) {
      const stock = await this.getStoreStock(item.storeId, item.variantId);
      if (stock < item.quantity) {
        unavailable.push({ ...item, available: stock });
      }
    }
    return {
      available: unavailable.length === 0,
      unavailable
    };
  }

  static async reserveInventory(storeId, items) {
    for (const item of items) {
      await this.decrementStoreStock(item.storeId, item.variantId, item.quantity);
    }
  }

  static async releaseInventory(storeId, items) {
    for (const item of items) {
      await this.incrementStoreStock(item.storeId, item.variantId, item.quantity);
    }
  }

  static generatePickupCode() {
    return 'PIK-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  static generateQRCode(orderId) {
    // In production, generate actual QR code
    return `BOPIS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  static sendPickupConfirmation(customerId, bopisOrder) {
    // Send email/SMS/push notification
    console.log('Sending pickup confirmation to customer', bopisOrder.id);
  }

  static notifyStoreForPickup(bopisOrder) {
    // Notify store staff via POS/dashboard
    console.log('Notifying store for pickup', bopisOrder.id);
  }

  // ============================================================
  // SHIP FROM STORE
  // ============================================================
  static initShipFromStore() {
    this.shipFromStoreOrders = new Map();
  }

  static async createShipFromStoreOrder(data) {
    const { orderId, customerId, items, shippingAddress, preferredStore } = data;

    // Find best store for fulfillment
    const store = await this.findBestStoreForFulfillment(items, shippingAddress, preferredStore);
    if (!store) {
      return { success: false, error: 'No store available for fulfillment' };
    }

    // Check inventory
    const inventoryCheck = await this.checkStoreInventory(store.id, items);
    if (!inventoryCheck.available) {
      return { success: false, error: 'Insufficient inventory', unavailable: inventoryCheck.unavailable };
    }

    // Reserve inventory
    await this.reserveInventory(store.id, items);

    const sfsOrder = {
      id: this.generateSFSId(),
      orderId,
      customerId,
      storeId: store.id,
      items,
      shippingAddress,
      status: 'assigned_to_store',
      fulfillmentStatus: 'awaiting_pick',
      storeAssignedAt: new Date().toISOString(),
      pickedAt: null,
      packedAt: null,
      shippedAt: null,
      deliveredAt: null,
      trackingNumber: null,
      carrier: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.shipFromStoreOrders.set(sfsOrder.id, sfsOrder);

    // Reserve inventory
    await this.reserveInventory(store.id, items);

    // Notify store for picking
    this.notifyStoreForPicking(sfsOrder);

    return { success: true, shipFromStoreOrder: sfsOrder };
  }

  static async findBestStoreForFulfillment(items, shippingAddress, preferredStore = null) {
    // If preferred store specified and has inventory, use it
    if (preferredStore) {
      const store = this.getStore(preferredStore);
      if (store) {
        const check = await this.checkStoreInventory(store.id, items);
        if (check.available) return store;
      }
    }

    // Find nearest store with inventory
    const stores = await this.getStoresWithInventory(items);
    
    if (stores.length === 0) return null;

    // Sort by distance to shipping address
    stores.sort((a, b) => {
      const distA = this.calculateDistance(a, shippingAddress);
      const distB = this.calculateDistance(b, shippingAddress);
      return distA - distB;
    });

    return stores[0];
  }

  static calculateDistance(store, address) {
    // Haversine formula for distance calculation
    // Simplified - in production use proper geolocation
    return Math.random() * 50; // Mock distance 0-50km
  }

  static notifyStoreForPicking(sfsOrder) {
    // Notify store staff via POS/dashboard/push
    console.log('Notifying store for picking:', sfsOrder.id);
  }

  // Order status updates
  static async updateSFSOrderStatus(sfsOrderId, status, userId = null) {
    const order = this.shipFromStoreOrders.get(sfsOrderId);
    if (!order) return { success: false, error: 'Order not found' };

    const validTransitions = {
      'assigned_to_store': ['picking'],
      'picking': ['picked', 'issue_reported'],
      'picked': ['packing'],
      'packing': ['packed', 'issue_reported'],
      'packed': ['ready_for_shipment'],
      'ready_for_shipment': ['shipped'],
      'shipped': ['in_transit'],
      'in_transit': ['out_for_delivery'],
      'out_for_delivery': ['delivered', 'delivery_failed'],
      'delivered': [],
      'delivery_failed': ['returned_to_store', 'rescheduled'],
      'returned_to_store': ['refunded', 'rescheduled'],
      'issue_reported': ['picking', 'cancelled']
    };

    const currentStatus = order.status;
    const validNext = validTransitions[currentStatus] || [];

    if (!validNext.includes(status)) {
      return { success: false, error: `Invalid transition from ${currentStatus} to ${status}` };
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.updatedBy = userId;

    // Set timestamps
    if (status === 'picked') order.pickedAt = new Date().toISOString();
    if (status === 'packed') order.packedAt = new Date().toISOString();
    if (status === 'shipped') order.shippedAt = new Date().toISOString();
    if (status === 'delivered') order.deliveredAt = new Date().toISOString();

    // Add to history
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      from: currentStatus,
      to: status,
      by: userId,
      at: new Date().toISOString()
    });

    this.shipFromStoreOrders.set(sfsOrderId, order);
    return { success: true, order };
  }

  // ============================================================
  // UNIFIED CUSTOMER PROFILES
  // ============================================================
  static initUnifiedProfiles() {
    this.unifiedProfiles = new Map();
  }

  static async getUnifiedProfile(customerId) {
    let profile = this.unifiedProfiles.get(customerId);
    
    if (!profile) {
      profile = await this.buildUnifiedProfile(customerId);
      this.unifiedProfiles.set(customerId, profile);
    }
    return profile;
  }

  static async buildUnifiedProfile(customerId) {
    // Aggregate data from all channels
    const onlineData = await this.getOnlineData(customerId);
    const storeData = await this.getStoreData(customerId);
    const posData = await this.getPOSData(customerId);

    return {
      customerId,
      personal: {
        id: customerId,
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        birthDate: null,
        gender: null
      },
      addresses: [],
      paymentMethods: [],
      loyalty: {
        tier: 'bronze',
        points: 0,
        lifetimePoints: 0
      },
      preferences: {
        language: 'sr-Cyrl',
        currency: 'RSD',
        marketingOptIn: false,
        smsOptIn: false,
        emailOptIn: true
      },
      activity: {
        onlineOrders: 0,
        storeOrders: 0,
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        lastOrderDate: null,
        favoriteCategories: [],
        preferredStore: null,
        preferredChannel: 'online' // online, store, omnichannel
      },
      interactions: {
        lastOnlineVisit: null,
        lastStoreVisit: null,
        lastPurchase: null,
        lastContact: null
      },
      devices: [],
      consents: {
        marketing: false,
        analytics: true,
        personalization: false,
        location: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static enrichProfile(customerId, channel, data) {
    const profile = this.unifiedProfiles.get(customerId);
    if (!profile) return;

    // Update based on channel
    switch (channel) {
      case 'online':
        profile.activity.onlineOrders++;
        profile.activity.lastOnlineVisit = new Date().toISOString();
        break;
      case 'store':
        profile.activity.storeOrders++;
        profile.activity.lastStoreVisit = new Date().toISOString();
        break;
      case 'pos':
        profile.activity.storeOrders++;
        profile.activity.lastStoreVisit = new Date().toISOString();
        break;
    }

    profile.activity.totalOrders = profile.activity.onlineOrders + profile.activity.storeOrders;
    profile.activity.lastPurchase = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();

    this.unifiedProfiles.set(customerId, profile);
  }

  // ============================================================
  // STORE LOCATOR & MANAGEMENT
  // ============================================================
  static initStoreLocator() {
    this.stores = new Map();
    this.loadStores();
  }

  static loadStores() {
    // Mock store data - in production from CMS/API
    const stores = [
      {
        id: 'store_001',
        name: 'DALLI Beograd Centar',
        type: 'flagship',
        address: 'Knez Mihailova 15, 11000 Beograd',
        city: 'Beograd',
        region: 'Beograd',
        coordinates: { lat: 44.8125, lng: 20.4612 },
        phone: '+381 11 123 4567',
        email: 'beograd-centar@dalli.rs',
        hours: {
          mon: { open: '09:00', close: '21:00' },
          tue: { open: '09:00', close: '21:00' },
          wed: { open: '09:00', close: '21:00' },
          thu: { open: '09:00', close: '21:00' },
          fri: { open: '09:00', close: '22:00' },
          sat: { open: '10:00', close: '20:00' },
          sun: { open: '10:00', close: '18:00' }
        },
        services: ['bopis', 'ship_from_store', 'returns', 'alterations', 'personal_shopper'],
        amenities: ['wifi', 'parking', 'cafe', 'fitting_rooms'],
        inventory: {
          totalSkus: 15000,
          categories: ['muska', 'zenska', 'dukseri', 'trenerke', 'aksesoari']
        },
        staffCount: 15,
        manager: 'Ana Petrović',
        status: 'active',
        coordinates: { lat: 44.8125, lng: 20.4612 }
      },
      {
        id: 'store_002',
        name: 'DALLI Novi Sad',
        type: 'standard',
        address: 'Bulevar Mihajla Pupina 10, 21000 Novi Sad',
        city: 'Novi Sad',
        region: 'Vojvodina',
        coordinates: { lat: 45.2671, lng: 19.8335 },
        phone: '+381 21 456 7890',
        email: 'novisad@dalli.rs',
        hours: {
          mon: { open: '09:00', close: '20:00' },
          tue: { open: '09:00', close: '20:00' },
          wed: { open: '09:00', close: '20:00' },
          thu: { open: '09:00', close: '20:00' },
          fri: { open: '09:00', close: '21:00' },
          sat: { open: '10:00', close: '19:00' },
          sun: { open: '10:00', close: '16:00' }
        },
        services: ['bopis', 'ship_from_store', 'returns'],
        amenities: ['parking', 'fitting_rooms'],
        inventory: {
          totalSkus: 8000,
          categories: ['muska', 'zenska', 'dukseri']
        },
        staffCount: 8,
        manager: 'Marko Jovanović',
        status: 'active',
        coordinates: { lat: 45.2671, lng: 19.8335 }
      }
      // More stores...
    ];

    stores.forEach(store => this.stores.set(store.id, store));
  }

  static getStore(storeId) {
    return this.stores.get(storeId);
  }

  static getAllStores() {
    return Array.from(this.stores.values());
  }

  static getStoresNearLocation(lat, lng, radiusKm = 50) {
    const stores = Array.from(this.stores.values()).filter(s => s.status === 'active');
    
    return stores
      .map(store => ({
        ...store,
        distance: this.calculateDistance(
          store.coordinates.lat, store.coordinates.lng,
          lat, lng
        )
      }))
      .filter(s => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static getStore(storeId) {
    return this.stores.get(storeId);
  }

  static getStoreHours(storeId) {
    const store = this.stores.get(storeId);
    if (!store) return null;

    const now = new Date();
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const hours = store.hours[day];

    if (!hours) return { open: false };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = this.parseTime(hours.open);
    const closeMinutes = this.parseTime(hours.close);

    return {
      open: nowMinutes >= openMinutes && nowMinutes < closeMinutes,
      opensAt: hours.open,
      closesAt: hours.close,
      isOpenNow: nowMinutes >= openMinutes && nowMinutes < closeMinutes
    };
  }

  static parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // ============================================================
  // INVENTORY SYNC
  // ============================================================
  static initInventorySync() {
    this.inventoryCache = new Map();
    this.syncInterval = null;
  }

  static startInventorySync(intervalMs = 300000) { // 5 minutes
    if (this.syncInterval) clearInterval(this.syncInterval);
    
    this.syncInterval = setInterval(() => {
      this.syncAllInventory();
    }, intervalMs);
  }

  static async syncAllInventory() {
    for (const store of this.stores.values()) {
      if (store.status === 'active') {
        await this.syncStoreInventory(store.id);
      }
    }
  }

  static async syncStoreInventory(storeId) {
    // In production, sync with store's inventory system
    // Mock implementation
    console.log(`Syncing inventory for store ${storeId}`);
  }

  static async getStoreStock(storeId, variantId) {
    // Mock - in production query store inventory system
    return Math.floor(Math.random() * 50);
  }

  static async decrementStoreStock(storeId, variantId, quantity) {
    // Update store inventory
    console.log(`Decrementing stock for store ${storeId}, variant ${variantId}, qty: ${quantity}`);
  }

  static async incrementStoreStock(storeId, variantId, quantity) {
    // Update store inventory
    console.log(`Incrementing stock for store ${storeId}, variant ${variantId}, qty: ${quantity}`);
  }

  // ============================================================
  // UNIFIED LOYALTY ACROSS CHANNELS
  // ============================================================
  static initUnifiedLoyalty() {
    // Loyalty points earned and redeemed across all channels
  }

  static async earnLoyaltyPoints(customerId, channel, amount, metadata = {}) {
    let profile = await this.getUnifiedProfile(customerId);
    
    let pointsEarned = Math.floor(amount / 100); // 1 point per 100 RSD
    
    // Channel multiplier
    const multipliers = {
      online: 1,
      store: 1.1,      // 10% bonus for in-store
      pos: 1.1,
      bopis: 1.05,
      ship_from_store: 1
    };
    
    const multiplier = multipliers[channel] || 1;
    pointsEarned = Math.floor(pointsEarned * multiplier);

    // Update profile
    profile = this.unifiedProfiles.get(customerId) || await this.buildUnifiedProfile(customerId);
    profile.loyalty.points += pointsEarned;
    profile.loyalty.lifetimeEarned += pointsEarned;
    
    // Check for tier upgrade
    this.checkTierUpgrade(profile);

    // Record transaction
    this.recordLoyaltyTransaction(customerId, {
      points: pointsEarned,
      channel,
      amount,
      timestamp: new Date().toISOString()
    });

    return { pointsEarned, newBalance: profile.loyalty.points };
  }

  static async redeemLoyaltyPoints(customerId, channel, points, rewardId) {
    let profile = await this.getUnifiedProfile(customerId);
    
    if (profile.loyalty.points < points) {
      return { success: false, error: 'Insufficient points' };
    }

    // Check reward availability
    const reward = this.getRewardById(rewardId);
    if (!reward || reward.pointsCost > profile.loyalty.points) {
      return { success: false, error: 'Insufficient points' };
    }

    // Deduct points
    profile.loyalty.points -= points;
    profile.loyalty.redeemed += points;

    // Record redemption
    this.recordRedemption(customerId, {
      points,
      rewardId,
      channel,
      timestamp: new Date().toISOString()
    });

    return { success: true, newBalance: profile.loyalty.points };
  }

  // ============================================================
  // STORE MANAGEMENT
  // ============================================================
  static initStoreManagement() {
    this.storeStaff = new Map();
    this.storeSchedules = new Map();
    this.storeKPIs = new Map();
  }

  static assignStaffToStore(staffId, storeId, role, schedule) {
    const key = `${storeId}-${staffId}`;
    this.storeStaff.set(key, {
      staffId,
      storeId,
      role, // manager, associate, cashier, picker, packer
      schedule, // { mon: {start: '09:00', end: '17:00'}, ... }
      assignedAt: new Date().toISOString()
    });
  }

  static getStoreStaff(storeId, date = new Date()) {
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(date).getDay()];
    
    const staff = [];
    for (const [key, assignment] of this.storeStaff.entries()) {
      if (assignment.storeId === storeId && assignment.schedule[day]) {
        staff.push(assignment);
      }
    }
    return staff;
  }

  static recordKPI(storeId, kpi, value, date = new Date()) {
    const key = `${storeId}-${date.toISOString().split('T')[0]}`;
    if (!this.storeKPIs.has(key)) {
      this.storeKPIs.set(key, { storeId, date: date.toISOString().split('T')[0] });
    }
    this.storeKPIs.get(key)[kpi] = value;
  }

  static getStoreKPIs(storeId, startDate, endDate) {
    const kpis = [];
    for (const [key, data] of this.storeKPIs.entries()) {
      if (data.storeId === storeId && data.date >= startDate && data.date <= endDate) {
        kpis.push(data);
      }
    }
    return kpis;
  }

  // ============================================================
  // UTILITIES
  // ============================================================
  static generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateBOPISId() {
    return `BOP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateSFSId() {
    return `SFS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  static generateBOPISId() {
    return `BOP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  static init() {
    this.initBOPIS();
    this.initShipFromStore();
    this.initUnifiedProfiles();
    this.initStoreLocator();
    this.initInventorySync();
    this.initPOSInterface();
    this.initUnifiedLoyalty();
    this.initStoreManagement();
    
    console.log('[OmnichannelPOS] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OmnichannelPOS.init());
} else {
  OmnichannelPOS.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OmnichannelPOS };
}

if (typeof window !== 'undefined') {
  window.OmnichannelPOS = OmnichannelPOS;
}