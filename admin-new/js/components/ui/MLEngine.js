/**
 * DALLI Advanced ML/AI Features
 * Visual search, size recommendation, demand forecasting, fraud detection
 */

export class MLEngine {
  static init() {
    this.models = new Map();
    this.featureStore = new Map();
    this.predictions = new Map();
    this.modelVersions = new Map();
    
    // Initialize TensorFlow.js if available
    if (typeof tf !== 'undefined') {
      this.tf = tf;
    }
    
    console.log('[MLEngine] Initialized');
  }

  // ============================================================
  // VISUAL SEARCH
  // ============================================================
  
  static async initVisualSearch() {
    // Load MobileNet or EfficientNet for feature extraction
    if (typeof tf !== 'undefined') {
      this.visualModel = await tf.loadLayersModel('/models/visual-search/model.json');
      this.featureExtractor = tf.model({
        inputs: this.visualModel.inputs,
        outputs: this.visualModel.getLayer('global_average_pooling2d').output
      });
    }
  }

  static async extractImageFeatures(imageElement) {
    if (!this.featureExtractor) {
      await this.initVisualSearch();
    }

    const tensor = tf.browser.fromPixels(imageElement)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .div(255.0)
      .expandDims(0);

    const features = this.featureExtractor.predict(tensor);
    const featuresArray = await features.data();
    
    tensor.dispose();
    
    return Array.from(featuresArray);
  }

  static async findSimilarProducts(imageElement, topK = 10) {
    const queryFeatures = await this.extractImageFeatures(imageElement);
    
    // In production, query vector database (Pinecone, Weaviate, etc.)
    // For now, mock similarity search
    const similarProducts = await this.findSimilarProducts(queryFeatures, topK);
    
    return similarProducts;
  }

  static async findSimilarProducts(queryFeatures, topK = 10) {
    // Mock implementation - in production, query vector database
    const similarProducts = [
      { productId: 1, similarity: 0.95, name: 'Osnovna Majica - Bela', price: 1290 },
      { productId: 2, similarity: 0.92, name: 'Osnovna Majica - Crna', price: 1290 },
      { productId: 3, similarity: 0.89, name: 'Muški Duks - Navy', price: 4290 },
      { productId: 4, similarity: 0.87, name: 'Ženska Trenerka - Roza', price: 3890 },
      { productId: 5, similarity: 0.85, name: 'Čarape - Set 3 para', price: 490 }
    ].slice(0, topK);

    return similarProducts;
  }

  // Real-time visual search from camera
  static async startVisualSearch(videoElement, onResult) {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    videoElement.srcObject = stream;
    await videoElement.play();

    const detectLoop = async () => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        const features = await this.extractImageFeatures(videoElement);
        const results = await this.findSimilarProducts(videoElement, 5);
        onResult(results);
      }
      requestAnimationFrame(detectLoop);
    };

    detectLoop();
  }

  // ============================================================
  // SIZE RECOMMENDATION
  // ============================================================

  static initSizeRecommendation() {
    this.sizeModel = {
      fitPreferences: new Map(),
      userMeasurements: new Map(),
      productDimensions: new Map(),
      returnReasons: new Map()
    };
  }

  static async recommendSize(userId, productId, userMeasurements = null) {
    // Get user's purchase history and returns
    const userProfile = await this.getUserFitProfile(userId);
    const productDimensions = await this.getProductDimensions(productId);
    
    // If user provided measurements
    if (userMeasurements) {
      return this.calculateBestFit(userMeasurements, productDimensions);
    }

    // Use collaborative filtering based on similar users
    const similarUsers = await this.findSimilarUsers(userId);
    const sizeVotes = this.aggregateSizeVotes(similarUsers, productId);
    
    // Consider return history
    const returnHistory = await this.getReturnHistory(userId, productId);
    
    return this.calculateRecommendedSize({
      userProfile: userProfile,
      productDimensions: productDimensions,
      similarUsers: sizeVotes,
      returnHistory: returnHistory
    });
  }

  static calculateBestFit(userMeasurements, productDimensions) {
    const { chest, waist, hips, height, weight } = userMeasurements;
    const { chest: pChest, waist: pWaist, hips: pHips, length } = productDimensions;

    const sizeScores = {};
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '36-40', '41-45', 'Standard 330ml', 'One Size'];

    if (sizes.length === 0) {
      return { recommendedSize: 'M', confidence: 0.5, alternatives: [] };
    }

    sizes.forEach(size => {
      const sizeChart = this.getSizeChart(size);
      let score = 100;
      
      // Chest fit
      const chestDiff = Math.abs(chest - pChest);
      score -= chestDiff * 0.5;
      
      // Waist fit
      const waistDiff = Math.abs(waist - pWaist);
      score -= waistDiff * 0.3;
      
      // Length fit
      const lengthDiff = Math.abs(height * 0.5 - length);
      score -= lengthDiff * 0.2;
      
      sizeScores[size] = Math.max(0, score);
    });

    // Return best fitting size
    const bestSize = Object.entries(sizeScores)
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      recommendedSize: bestSize,
      confidence: sizeScores[bestSize] / 100,
      alternatives: Object.entries(sizeScores)
        .sort((a, b) => b[1] - a[1])
        .slice(1, 3)
        .map(([size, score]) => ({ size, confidence: score / 100 }))
    };
  }

  static getSizeChart(size) {
    const charts = {
      'XS': { chest: 84, waist: 68, hips: 90, length: 68 },
      'S': { chest: 90, waist: 72, hips: 94, length: 70 },
      'M': { chest: 96, waist: 76, hips: 98, length: 72 },
      'L': { chest: 102, waist: 80, hips: 102, length: 74 },
      'XL': { chest: 108, waist: 84, hips: 106, length: 76 },
      'XXL': { chest: 114, waist: 88, hips: 110, length: 78 },
      '3XL': { chest: 120, waist: 92, hips: 114, length: 80 }
    };
    return charts[size] || charts['M'];
  }

  // ============================================================
  // DEMAND FORECASTING
  // ============================================================

  static initDemandForecasting() {
    this.forecastModels = new Map();
    this.historicalData = new Map();
    this.seasonalPatterns = new Map();
  }

  static async forecastDemand(productId, horizonDays = 30) {
    const historicalData = await this.getHistoricalSales(productId);
    const productInfo = await this.getProductInfo(productId);
    
    // Simple time series forecasting (in production, use Prophet/ARIMA/LSTM)
    const forecast = this.generateForecast(historicalData, horizonDays);
    
    // Add seasonality
    const seasonalFactors = this.getSeasonalFactors(productId);
    
    // Apply external factors
    const externalFactors = await this.getExternalFactors();
    
    return {
      productId,
      predictions: this.generatePredictions(historicalData, horizonDays, seasonalFactors),
      confidence: this.calculateConfidence(historicalData),
      recommendations: this.generateRecommendations(forecast, productInfo)
    };
  }

  static generateForecast(historicalData, horizonDays, seasonalFactors) {
    // Simple moving average with trend (in production: Prophet, ARIMA, or LSTM)
    const recentData = historicalData.slice(-30);
    const avgDailySales = recentData.reduce((sum, d) => sum + d.units, 0) / recentData.length;
    const trend = this.calculateTrend(recentData);
    
    const predictions = [];
    for (let i = 1; i <= horizonDays; i++) {
      const basePrediction = avgDailySales + trend * i;
      const seasonalFactor = seasonalFactors[new Date(Date.now() + i * 86400000).getDay()] || 1;
      const prediction = Math.max(0, Math.round(basePrediction * seasonalFactor));
      
      predictions.push({
        date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
        predictedUnits: prediction,
        confidence: Math.max(0.5, 1 - i / horizonDays * 0.5)
      });
    }
    
    return predictions;
  }

  static calculateTrend(data) {
    if (data.length < 2) return 0;
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.units);
    
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += (x[i] - xMean) ** 2;
    }
    return numerator / denominator;
  }

  static getSeasonalFactors(productId) {
    // Day of week factors
    return {
      0: 1.2, // Sunday
      1: 0.9, // Monday
      2: 0.85, // Tuesday
      3: 0.9, // Wednesday
      4: 1.0, // Thursday
      5: 1.1, // Friday
      6: 1.3  // Saturday
    };
  }

  static async getExternalFactors() {
    return {
      holidays: await this.getUpcomingHolidays(),
      weather: await this.getWeatherForecast(),
      events: await this.getLocalEvents(),
      competitorPrices: await this.getCompetitorPrices()
    };
  }

  static generateRecommendations(forecast, productInfo) {
    const recommendations = [];
    
    // Stock alerts
    const maxPredicted = Math.max(...forecast.predictions.map(p => p.predictedUnits));
    const currentStock = productInfo.stock;
    
    if (currentStock < maxPredicted * 7) {
      recommendations.push({
        type: 'restock',
        urgency: 'high',
        message: `Preporučuje se naručivanje za ${Math.ceil(maxPredicted * 14 - currentStock)} komada za naredne 2 nedelje`
      });
    }

    // Pricing optimization
    if (productInfo.priceElasticity < -1.5) {
      recommendations.push({
        type: 'price_optimization',
        message: 'Proizvod je elastičan po ceni - razmotrite sniženje za 5-10% za povečanje prodaje'
      });
    }

    return recommendations;
  }

  // ============================================================
  // FRAUD DETECTION
  // ============================================================

  static initFraudDetection() {
    this.fraudRules = [
      // Velocity checks
      { name: 'velocity_check', weight: 0.3, threshold: 5 },
      { name: 'amount_anomaly', weight: 0.25, threshold: 3 },
      { name: 'geo_anomaly', weight: 0.2, threshold: 2 },
      { name: 'device_fingerprint', weight: 0.15, threshold: 3 },
      { name: 'email_domain', weight: 0.1, threshold: 2 }
    ];

    this.fraudThresholds = {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.9
    };
  }

  static async assessFraudRisk(orderData) {
    const riskFactors = [];
    let totalScore = 0;
    let maxWeight = 0;

    // Velocity check
    const recentOrders = await this.getRecentOrders(orderData.customerId, 24);
    if (recentOrders.length > 5) {
      riskFactors.push({ factor: 'velocity_check', score: 0.8, reason: 'Previše narudžbina u zadnjih 24h' });
      totalScore += 0.3 * 0.8;
    }
    maxWeight += 0.3;

    // Amount anomaly
    const avgOrderValue = await this.getAverageOrderValue(orderData.customerId);
    if (enteredAmount > avgOrderValue * 3) {
      riskFactors.push({ factor: 'amount_anomaly', score: 0.7, reason: 'Iznos znatno veći od proseka' });
      totalScore += 0.25 * 0.7;
    }
    maxWeight += 0.25;

    // Geo anomaly
    const userLocation = await this.getUserLocation(orderData.customerId);
    const orderLocation = orderData.shippingAddress?.city;
    if (userLocation && orderLocation && userLocation !== orderLocation) {
      const distance = this.calculateDistance(userLocation, orderLocation);
      if (distance > 500) {
        riskFactors.push({ factor: 'geo_anomaly', score: 0.6, reason: `Velika udaljenost: ${distance}km` });
        totalScore += 0.2 * 0.6;
      }
    }
    maxWeight += 0.2;

    // Device fingerprint
    const deviceFingerprint = await this.getDeviceFingerprint();
    const knownDevices = await this.getKnownDevices(orderData.customerId);
    if (!knownDevices.includes(deviceFingerprint)) {
      riskFactors.push({ factor: 'new_device', score: 0.4, reason: 'Nepoznat uređaj' });
      totalScore += 0.15 * 0.4;
    }
    maxWeight += 0.15;

    // Email domain reputation
    const emailDomain = orderData.email.split('@')[1];
    const riskyDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
    if (riskyDomains.includes(emailDomain)) {
      riskFactors.push({ factor: 'suspicious_email', score: 0.9, reason: 'Sumnjiv email domen' });
      totalScore += 0.1 * 0.9;
    }
    maxWeight += 0.1;

    const finalScore = maxWeight > 0 ? totalScore / maxWeight : 0;
    const riskLevel = finalScore >= 0.7 ? 'critical' : 
                      finalScore >= 0.5 ? 'high' :
                      finalScore >= 0.3 ? 'medium' : 'low';

    return {
      score: finalScore,
      riskLevel,
      factors: riskFactors,
      recommendation: this.getFraudRecommendation(riskLevel),
      requiresReview: finalScore >= 0.5
    };
  }

  static getFraudRecommendation(riskLevel) {
    switch (riskLevel) {
      case 'critical':
        return { action: 'block', message: 'Blokiraj narudžbinu - kritičan rizik' };
      case 'high':
        return { action: 'review', message: 'Ručna provera potrebna' };
      case 'medium':
        return { action: 'verify', message: 'Dodatna verifikacija (SMS/Email)' };
      default:
        return { action: 'approve', message: 'Standardna obrada' };
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  static generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static async getUserProfile(userId) {
    return { id: userId, measurements: null, preferences: {} };
  }

  static async getProductDimensions(productId) {
    return { chest: 100, waist: 80, hips: 100, length: 70 };
  }

  static async getHistoricalSales(productId) {
    // Mock data - in production, fetch from analytics DB
    return Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (90 - i) * 86400000).toISOString().split('T')[0],
      units: Math.floor(Math.random() * 20) + 5,
      revenue: Math.floor(Math.random() * 50000) + 10000
    }));
  }

  static async getProductInfo(productId) {
    return { 
      id: productId, 
      price: 2990, 
      stock: 50, 
      category: 'majice',
      priceElasticity: -1.8
    };
  }

  static async getExternalFactors() {
    return { holidays: [], weather: 'sunny', events: [], competitorPrices: {} };
  }

  static async getRecentOrders(customerId, hours) {
    return []; // Mock
  }

  static async getAverageOrderValue(customerId) {
    return 5000; // Mock
  }

  static async getUserLocation(customerId) {
    return 'Beograd'; // Mock
  }

  static async getKnownDevices(customerId) {
    return ['device_1', 'device_2']; // Mock
  }

  static async getDeviceFingerprint() {
    return 'fp_' + Math.random().toString(36).substr(2, 16);
  }

  static calculateDistance(loc1, loc2) {
    // Haversine formula
    return 100; // Mock
  }

  static async getKnownDevices(customerId) {
    return ['device_1', 'device_2'];
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MLEngine.init());
} else {
  MLEngine.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MLEngine };
}

if (typeof window !== 'undefined') {
  window.MLEngine = MLEngine;
}