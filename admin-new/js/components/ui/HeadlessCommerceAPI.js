/**
 * DALLI Headless Commerce API
 * GraphQL/REST API for third-party integrations, webhooks, rate limiting
 */

export class HeadlessCommerceAPI {
  static init() {
    this.endpoints = new Map();
    this.webhooks = new Map();
    this.rateLimits = new Map();
    this.apiKeys = new Map();
    this.subscriptions = new Map();
    
    this.initEndpoints();
    this.initRateLimits();
    console.log('[HeadlessCommerceAPI] Initialized');
  }

  static initEndpoints() {
    // REST API Endpoints
    this.endpoints.set('products', {
      list: { method: 'GET', path: '/api/v1/products', auth: 'public', cache: 300 },
      get: { method: 'GET', path: '/api/v1/products/:id', auth: 'public', cache: 300 },
      create: { method: 'POST', path: '/api/v1/products', auth: 'write:products', cache: 0 },
      update: { method: 'PATCH', path: '/api/v1/products/:id', auth: 'write:products', cache: 0 },
      delete: { method: 'DELETE', path: '/api/v1/products/:id', auth: 'write:products', cache: 0 },
      variants: { method: 'GET', path: '/api/v1/products/:id/variants', auth: 'public', cache: 300 },
      images: { method: 'GET', path: '/api/v1/products/:id/images', auth: 'public', cache: 300 }
    });

    this.endpoints.set('categories', {
      list: { method: 'GET', path: '/api/v1/categories', auth: 'public', cache: 3600 },
      get: { method: 'GET', path: '/api/v1/categories/:id', auth: 'public', cache: 3600 },
      tree: { method: 'GET', path: '/api/v1/categories/tree', auth: 'public', cache: 3600 }
    });

    this.endpoints.set('orders', {
      list: { method: 'GET', path: '/api/v1/orders', auth: 'read:orders', cache: 0 },
      get: { method: 'GET', path: '/api/v1/orders/:id', auth: 'read:orders', cache: 0 },
      create: { method: 'POST', path: '/api/v1/orders', auth: 'write:orders', cache: 0 },
      update: { method: 'PATCH', path: '/api/v1/orders/:id', auth: 'write:orders', cache: 0 },
      cancel: { method: 'POST', path: '/api/v1/orders/:id/cancel', auth: 'write:orders', cache: 0 },
      refund: { method: 'POST', path: '/api/v1/orders/:id/refund', auth: 'write:orders', cache: 0 },
      shipments: { method: 'GET', path: '/api/v1/orders/:id/shipments', auth: 'read:orders', cache: 60 }
    });

    this.endpoints.set('customers', {
      list: { method: 'GET', path: '/api/v1/customers', auth: 'read:customers', cache: 0 },
      get: { method: 'GET', path: '/api/v1/customers/:id', auth: 'read:customers', cache: 0 },
      create: { method: 'POST', path: '/api/v1/customers', auth: 'write:customers', cache: 0 },
      update: { method: 'PATCH', path: '/api/v1/customers/:id', auth: 'write:customers', cache: 0 },
      addresses: { method: 'GET', path: '/api/v1/customers/:id/addresses', auth: 'read:customers', cache: 0 },
      orders: { method: 'GET', path: '/api/v1/customers/:id/orders', auth: 'read:orders', cache: 0 }
    });

    this.endpoints.set('cart', {
      get: { method: 'GET', path: '/api/v1/cart', auth: 'public', cache: 0 },
      add: { method: 'POST', path: '/api/v1/cart/items', auth: 'public', cache: 0 },
      update: { method: 'PATCH', path: '/api/v1/cart/items/:id', auth: 'public', cache: 0 },
      remove: { method: 'DELETE', path: '/api/v1/cart/items/:id', auth: 'public', cache: 0 },
      clear: { method: 'DELETE', path: '/api/v1/cart', auth: 'public', cache: 0 },
      shipping: { method: 'POST', path: '/api/v1/cart/shipping-rates', auth: 'public', cache: 0 }
    });

    this.endpoints.set('checkout', {
      create: { method: 'POST', path: '/api/v1/checkout', auth: 'public', cache: 0 },
      get: { method: 'GET', path: '/api/v1/checkout/:token', auth: 'public', cache: 0 },
      update: { method: 'PATCH', path: '/api/v1/checkout/:token', auth: 'public', cache: 0 },
      complete: { method: 'POST', path: '/api/v1/checkout/:token/complete', auth: 'public', cache: 0 },
      paymentMethods: { method: 'GET', path: '/api/v1/checkout/:token/payment-methods', auth: 'public', cache: 300 }
    });

    this.endpoints.set('inventory', {
      check: { method: 'POST', path: '/api/v1/inventory/check', auth: 'read:inventory', cache: 0 },
      adjust: { method: 'POST', path: '/api/v1/inventory/adjust', auth: 'write:inventory', cache: 0 },
      reservations: { method: 'GET', path: '/api/v1/inventory/reservations', auth: 'read:inventory', cache: 0 },
      locations: { method: 'GET', path: '/api/v1/inventory/locations', auth: 'read:inventory', cache: 3600 }
    });

    this.endpoints.set('analytics', {
      events: { method: 'POST', path: '/api/v1/analytics/events', auth: 'write:analytics', cache: 0 },
      reports: { method: 'GET', path: '/api/v1/analytics/reports', auth: 'read:analytics', cache: 300 },
      realtime: { method: 'GET', path: '/api/v1/analytics/realtime', auth: 'read:analytics', cache: 0 }
    });

    // GraphQL Schema Definition
    this.graphQLSchema = `
      type Product {
        id: ID!
        sku: String!
        name: String!
        description: String
        price: Money!
        compareAtPrice: Money
        currency: Currency!
        images: [Image!]!
        variants: [ProductVariant!]!
        categories: [Category!]!
        tags: [String!]!
        inventory: Inventory!
        seo: SEO
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      type ProductVariant {
        id: ID!
        sku: String!
        name: String!
        price: Money!
        compareAtPrice: Money
        options: [VariantOption!]!
        inventory: Inventory!
        image: Image
      }

      type VariantOption {
        name: String!
        value: String!
      }

      type Inventory {
        quantity: Int!
        available: Int!
        reserved: Int!
        incoming: Int!
        location: String
        managed: Boolean!
      }

      type Category {
        id: ID!
        name: String!
        slug: String!
        description: String
        image: Image
        parent: Category
        children: [Category!]!
        productCount: Int!
      }

      type Image {
        id: ID!
        url: String!
        alt: String
        width: Int
        height: Int
      }

      type Money {
        amount: Float!
        currency: Currency!
        formatted: String!
      }

      enum Currency {
        RSD
        EUR
        USD
        BAM
        GBP
      }

      type SEO {
        title: String
        description: String
        keywords: [String!]
      }

      type Customer {
        id: ID!
        email: String!
        firstName: String
        lastName: String
        phone: String
        addresses: [Address!]!
        orders: [Order!]!
        groups: [CustomerGroup!]!
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      type Address {
        id: ID!
        firstName: String!
        lastName: String!
        company: String
        address1: String!
        address2: String
        city: String!
        province: String
        country: String!
        postalCode: String!
        phone: String
        isDefault: Boolean!
      }

      type CustomerGroup {
        id: ID!
        name: String!
        discount: Float
      }

      type Order {
        id: ID!
        orderNumber: String!
        status: OrderStatus!
        financialStatus: FinancialStatus!
        fulfillmentStatus: FulfillmentStatus!
        customer: Customer
        email: String!
        lineItems: [LineItem!]!
        shippingAddress: Address
        billingAddress: Address
        shippingMethod: ShippingMethod
        paymentMethod: PaymentMethod
        subtotal: Money!
        shipping: Money!
        tax: Money!
        discount: Money!
        total: Money!
        currency: Currency!
        notes: String
        tags: [String!]!
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      enum OrderStatus {
        OPEN
        CONFIRMED
        PROCESSING
        SHIPPED
        DELIVERED
        CANCELLED
        REFUNDED
      }

      enum FinancialStatus {
        PENDING
        AUTHORIZED
        PAID
        PARTIALLY_REFUNDED
        REFUNDED
        VOIDED
      }

      enum FulfillmentStatus {
        UNFULFILLED
        PARTIAL
        FULFILLED
        RESTOCKED
      }

      type LineItem {
        id: ID!
        product: Product!
        variant: ProductVariant
        quantity: Int!
        price: Money!
        totalDiscount: Money!
        properties: [LineItemProperty!]!
      }

      type LineItemProperty {
        name: String!
        value: String!
      }

      type ShippingMethod {
        id: ID!
        name: String!
        price: Money!
        estimatedDays: String
      }

      type PaymentMethod {
        id: ID!
        type: String!
        name: String!
        details: JSON
      }

      type Cart {
        id: ID!
        lines: [CartLine!]!
        subtotal: Money!
        total: Money!
        currency: Currency!
        estimatedShipping: Money
        estimatedTax: Money
        discountCodes: [DiscountCode!]!
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      type CartLine {
        id: ID!
        product: Product!
        variant: ProductVariant
        quantity: Int!
        price: Money!
        totalDiscount: Money!
      }

      type DiscountCode {
        code: String!
        type: DiscountType!
        value: Float!
        description: String
      }

      enum DiscountType {
        PERCENTAGE
        FIXED_AMOUNT
        FREE_SHIPPING
      }

      type Checkout {
        id: ID!
        token: String!
        cart: Cart!
        email: String
        shippingAddress: Address
        billingAddress: Address
        shippingMethod: ShippingMethod
        paymentMethod: PaymentMethod
        paymentDue: Money!
        webUrl: String!
        completedAt: DateTime
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      type Query {
        product(id: ID!): Product
        products(first: Int, after: String, filter: ProductFilter, sort: ProductSort): ProductConnection!
        productByHandle(handle: String!): Product
        category(id: ID!): Category
        categories(first: Int, after: String): CategoryConnection!
        customer(id: ID!): Customer
        customerByEmail(email: String!): Customer
        order(id: ID!): Order
        orders(first: Int, after: String, filter: OrderFilter): OrderConnection!
        cart(id: ID!): Cart
        checkout(token: String!): Checkout
        inventory(productId: ID!, variantId: ID): Inventory
        me: Customer
      }

      input ProductFilter {
        category: ID
        vendor: String
        tag: String
        minPrice: Float
        maxPrice: Float
        available: Boolean
        search: String
      }

      enum ProductSort {
        RELEVANCE
        BEST_SELLING
        CREATED_DESC
        CREATED_ASC
        PRICE_ASC
        PRICE_DESC
        TITLE_ASC
        TITLE_DESC
      }

      input OrderFilter {
        status: OrderStatus
        financialStatus: FinancialStatus
        customerId: ID
        dateFrom: DateTime
        dateTo: DateTime
      }

      type ProductConnection {
        edges: [ProductEdge!]!
        pageInfo: PageInfo!
      }

      type ProductEdge {
        node: Product!
        cursor: String!
      }

      type CategoryConnection {
        edges: [CategoryEdge!]!
        pageInfo: PageInfo!
      }

      type CategoryEdge {
        node: Category!
        cursor: String!
      }

      type OrderConnection {
        edges: [OrderEdge!]!
        pageInfo: PageInfo!
      }

      type OrderEdge {
        node: Order!
        cursor: String!
      }

      type PageInfo {
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
        startCursor: String
        endCursor: String
      }

      type Mutation {
        cartCreate(input: CartInput!): Cart!
        cartLinesAdd(cartId: ID!, lines: [CartLineInput!]!): Cart!
        cartLinesUpdate(cartId: ID!, lines: [CartLineUpdateInput!]!): Cart!
        cartLinesRemove(cartId: ID!, lineIds: [ID!]!): Cart!
        cartDiscountCodesUpdate(cartId: ID!, codes: [String!]!): Cart!
        checkoutCreate(input: CheckoutInput!): Checkout!
        checkoutUpdate(token: String!, input: CheckoutUpdateInput!): Checkout!
        checkoutComplete(token: String!, payment: PaymentInput!): CheckoutCompleteResult!
        customerCreate(input: CustomerCreateInput!): CustomerCreateResult!
        customerAccessTokenCreate(input: CustomerAccessTokenInput!): CustomerAccessTokenResult!
        customerAccessTokenRenew(token: String!): CustomerAccessTokenResult!
      }

      input CartInput {
        lines: [CartLineInput!]
        discountCodes: [String!]
        attributes: [AttributeInput!]
      }

      input CartLineInput {
        productId: ID!
        variantId: ID
        quantity: Int!
        attributes: [AttributeInput!]
      }

      input CartLineUpdateInput {
        id: ID!
        quantity: Int!
      }

      input CheckoutInput {
        cartId: ID!
        email: String
        shippingAddress: AddressInput
        billingAddress: AddressInput
        shippingMethodId: ID
        paymentMethodId: ID
      }

      input CheckoutUpdateInput {
        email: String
        shippingAddress: AddressInput
        billingAddress: AddressInput
        shippingMethodId: ID
        paymentMethodId: ID
      }

      input PaymentInput {
        type: String!
        token: String
        details: JSON
      }

      type CheckoutCompleteResult {
        checkout: Checkout
        order: Order
        errors: [UserError!]!
      }

      type UserError {
        field: [String!]
        message: String!
        code: String
      }

      input CustomerCreateInput {
        email: String!
        password: String!
        firstName: String
        lastName: String
        phone: String
      }

      type CustomerCreateResult {
        customer: Customer
        customerAccessToken: String
        errors: [UserError!]!
      }

      input CustomerAccessTokenInput {
        email: String!
        password: String!
      }

      type CustomerAccessTokenResult {
        customerAccessToken: String
        expiresAt: DateTime
        errors: [UserError!]!
      }

      input AddressInput {
        firstName: String!
        lastName: String!
        company: String
        address1: String!
        address2: String
        city: String!
        province: String
        country: String!
        postalCode: String!
        phone: String
      }

      input AttributeInput {
        key: String!
        value: String!
      }

      scalar DateTime
      scalar JSON
    `;
  }

  static initRateLimits() {
    // Rate limits per tier
    this.rateLimits.set('public', {
      requests: 100,
      window: 60000, // 1 minute
      burst: 20
    });

    this.rateLimits.set('authenticated', {
      requests: 500,
      window: 60000,
      burst: 50
    });

    this.rateLimits.set('partner', {
      requests: 2000,
      window: 60000,
      burst: 200
    });

    this.rateLimits.set('admin', {
      requests: 10000,
      window: 60000,
      burst: 1000
    });

    // Specific endpoint limits
    this.endpointLimits = new Map([
      ['/api/v1/checkout', { requests: 30, window: 60000 }],
      ['/api/v1/cart', { requests: 60, window: 60000 }],
      ['/api/v1/analytics/events', { requests: 1000, window: 60000 }],
      ['/api/v1/products', { requests: 200, window: 60000 }],
      ['/api/v1/orders', { requests: 100, window: 60000 }]
    ]);
  }

  // ============================================================
  // API KEY MANAGEMENT
  // ============================================================

  static generateApiKey(name, tier = 'partner', permissions = []) {
    const keyId = 'dlk_' + this.generateId();
    const secret = this.generateSecret();
    const prefix = keyId.substring(0, 12);
    
    const apiKey = {
      id: keyId,
      name,
      prefix,
      secret: secret, // Only shown once!
      hashedSecret: this.hashSecret(secret),
      tier,
      permissions,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      expiresAt: null,
      active: true
    };

    this.apiKeys.set(keyId, apiKey);
    
    return {
      keyId,
      prefix,
      secret, // Only returned once
      tier,
      permissions
    };
  }

  static validateApiKey(keyId, secret) {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey || !apiKey.active) return { valid: false, reason: 'Invalid or inactive key' };
    
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, reason: 'API key expired' };
    }

    if (apiKey.hashedSecret !== this.hashSecret(secret)) {
      return { valid: false, reason: 'Invalid secret' };
    }

    apiKey.lastUsed = new Date().toISOString();
    return { valid: true, tier: apiKey.tier, permissions: apiKey.permissions };
  }

  static hashSecret(secret) {
    // In production, use bcrypt or similar
    return btoa(secret).substring(0, 32);
  }

  static generateSecret() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================

  static checkRateLimit(keyId, endpoint, tier = 'public') {
    const limit = this.rateLimits.get(tier) || this.rateLimits.get('public');
    const endpointLimit = this.endpointLimits.get(endpoint);
    
    const effectiveLimit = endpointLimit || limit;
    const now = Date.now();
    const windowStart = now - effectiveLimit.window;
    
    // In production, use Redis for distributed rate limiting
    const key = `ratelimit:${keyId}:${endpoint}`;
    const requests = this.getRequestCount(key, windowStart);
    
    if (requests >= effectiveLimit.requests) {
      return {
        allowed: false,
        limit: effectiveLimit.requests,
        remaining: 0,
        resetAt: now + effectiveLimit.window,
        retryAfter: effectiveLimit.window
      };
    }

    this.incrementRequestCount(key);
    
    return {
      allowed: true,
      limit: effectiveLimit.requests,
      remaining: effectiveLimit.requests - requests - 1,
      resetAt: now + effectiveLimit.window
    };
  }

  static getRequestCount(key, windowStart) {
    // Mock - in production use Redis sorted sets
    return Math.floor(Math.random() * 10);
  }

  static incrementRequestCount(key) {
    // Mock - in production use Redis INCR with expiry
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  static registerWebhook(url, events, secret = null) {
    const webhookId = 'wh_' + this.generateId();
    const webhookSecret = secret || this.generateSecret().substring(0, 32);
    
    const webhook = {
      id: webhookId,
      url,
      events,
      secret: webhookSecret,
      active: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      failureCount: 0,
      lastError: null
    };

    this.webhooks.set(webhookId, webhook);
    
    events.forEach(event => {
      if (!this.subscriptions.has(event)) {
        this.subscriptions.set(event, new Set());
      }
      this.subscriptions.get(event).add(webhookId);
    });

    return {
      id: webhookId,
      url,
      events,
      secret: webhookSecret
    };
  }

  static async triggerWebhook(event, payload) {
    const webhookIds = this.subscriptions.get(event);
    if (!webhookIds || webhookIds.size === 0) return;

    const webhookPayload = {
      id: 'evt_' + this.generateId(),
      type: event,
      createdAt: new Date().toISOString(),
      data: payload
    };

    const signature = this.generateSignature(webhookPayload, 'shared_secret');

    for (const webhookId of webhookIds) {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook || !webhook.active) continue;

      try {
        await this.deliverWebhook(webhook, webhookPayload, signature);
        webhook.lastTriggered = new Date().toISOString();
        webhook.failureCount = 0;
      } catch (error) {
        webhook.failureCount++;
        webhook.lastError = error.message;
        
        if (webhook.failureCount >= 5) {
          webhook.active = false;
          console.error(`Webhook ${webhookId} disabled after 5 failures`);
        }
      }
    }
  }

  static async deliverWebhook(webhook, payload, signature) {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dalli-Signature': signature,
        'X-Dalli-Event': payload.type,
        'X-Dalli-Delivery': payload.id,
        'User-Agent': 'DALLI-Webhooks/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }
  }

  static generateSignature(payload, secret) {
    // In production, use HMAC-SHA256
    const data = JSON.stringify(payload) + secret;
    return btoa(data).substring(0, 64);
  }

  static verifyWebhookSignature(payload, signature, secret) {
    const expected = this.generateSignature(payload, secret);
    return signature === expected;
  }

  // ============================================================
  // GRAPHQL EXECUTION
  // ============================================================

  static async executeGraphQL(query, variables = {}, context = {}) {
    // In production, use Apollo Server or similar
    // This is a mock implementation
    
    const startTime = Date.now();
    
    try {
      // Parse and validate query
      const validation = this.validateGraphQL(query);
      if (!validation.valid) {
        return { errors: validation.errors };
      }

      // Execute query (mock)
      const data = await this.executeQuery(query, variables, context);
      
      return {
        data,
        extensions: {
          duration: Date.now() - startTime,
          complexity: this.calculateComplexity(query)
        }
      };
    } catch (error) {
      return {
        errors: [{ message: error.message, locations: [] }]
      };
    }
  }

  static validateGraphQL(query) {
    // Basic validation - in production use graphql-js validation
    if (!query || query.trim().length === 0) {
      return { valid: false, errors: [{ message: 'Query is empty' }] };
    }
    return { valid: true, errors: [] };
  }

  static async executeQuery(query, variables, context) {
    // Mock implementation - in production, resolve against data sources
    return { message: 'GraphQL execution not implemented in frontend' };
  }

  static calculateComplexity(query) {
    // Simple complexity calculation
    const fields = (query.match(/\w+(?=\s*[{(,])/g) || []).length;
    return fields;
  }

  // ============================================================
  // SDK HELPERS
  // ============================================================

  static createClient(config) {
    return new HeadlessClient(config);
  }

  static getSchema() {
    return this.graphQLSchema;
  }

  static getEndpoints() {
    const endpoints = {};
    this.endpoints.forEach((value, key) => {
      endpoints[key] = value;
    });
    return endpoints;
  }
}

class HeadlessClient {
  constructor(config) {
    this.baseUrl = config.baseUrl || '/api/v1';
    this.apiKey = config.apiKey;
    this.tier = config.tier || 'public';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (this.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }

  async request(method, path, data = null, params = {}) {
    const url = new URL(this.baseUrl + path, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const options = {
      method,
      headers: { ...this.defaultHeaders },
      credentials: 'include'
    };

    if (data && ['POST', 'PATCH', 'PUT'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    // Rate limit check
    const rateLimit = HeadlessCommerceAPI.checkRateLimit(this.apiKey || 'anonymous', path, this.tier);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}ms`);
    }

    const response = await fetch(url, options);
    
    // Add rate limit headers to response
    response.rateLimit = rateLimit;

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new APIError(response.status, error.message, error);
    }

    return response.json();
  }

  // Products
  async getProducts(params = {}) {
    return this.request('GET', '/products', null, params);
  }

  async getProduct(id) {
    return this.request('GET', `/products/${id}`);
  }

  async createProduct(product) {
    return this.request('POST', '/products', product);
  }

  async updateProduct(id, product) {
    return this.request('PATCH', `/products/${id}`, product);
  }

  // Categories
  async getCategories(params = {}) {
    return this.request('GET', '/categories', null, params);
  }

  async getCategoryTree() {
    return this.request('GET', '/categories/tree');
  }

  // Orders
  async getOrders(params = {}) {
    return this.request('GET', '/orders', null, params);
  }

  async getOrder(id) {
    return this.request('GET', `/orders/${id}`);
  }

  async createOrder(order) {
    return this.request('POST', '/orders', order);
  }

  async updateOrder(id, order) {
    return this.request('PATCH', `/orders/${id}`, order);
  }

  // Customers
  async getCustomers(params = {}) {
    return this.request('GET', '/customers', null, params);
  }

  async getCustomer(id) {
    return this.request('GET', `/customers/${id}`);
  }

  // Cart
  async getCart() {
    return this.request('GET', '/cart');
  }

  async addToCart(productId, variantId, quantity = 1) {
    return this.request('POST', '/cart/items', { productId, variantId, quantity });
  }

  async updateCartItem(id, quantity) {
    return this.request('PATCH', `/cart/items/${id}`, { quantity });
  }

  async removeFromCart(id) {
    return this.request('DELETE', `/cart/items/${id}`);
  }

  // Checkout
  async createCheckout(cartId, input) {
    return this.request('POST', '/checkout', { cartId, ...input });
  }

  async getCheckout(token) {
    return this.request('GET', `/checkout/${token}`);
  }

  async updateCheckout(token, input) {
    return this.request('PATCH', `/checkout/${token}`, input);
  }

  async completeCheckout(token, payment) {
    return this.request('POST', `/checkout/${token}/complete`, { payment });
  }

  // GraphQL
  async graphql(query, variables = {}) {
    return this.request('POST', '/graphql', { query, variables });
  }

  // Webhooks
  async registerWebhook(url, events) {
    return this.request('POST', '/webhooks', { url, events });
  }

  async listWebhooks() {
    return this.request('GET', '/webhooks');
  }

  async deleteWebhook(id) {
    return this.request('DELETE', `/webhooks/${id}`);
  }
}

class APIError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HeadlessCommerceAPI.init());
} else {
  HeadlessCommerceAPI.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HeadlessCommerceAPI, HeadlessClient, APIError };
}

if (typeof window !== 'undefined') {
  window.HeadlessCommerceAPI = HeadlessCommerceAPI;
  window.HeadlessClient = HeadlessClient;
  window.APIError = APIError;
}