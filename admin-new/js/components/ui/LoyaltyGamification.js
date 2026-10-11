/**
 * DALLI Advanced Loyalty & Gamification
 * Tiered loyalty, points, referrals, achievements, VIP perks
 */

export class LoyaltyGamification {
  static init() {
    this.initLoyaltyTiers();
    this.initPointsSystem();
    this.initReferralProgram();
    this.initAchievements();
    this.initVIPPerks();
    this.initGamificationUI();
  }

  // ============================================================
  // LOYALTY TIERS
  // ============================================================
  static initLoyaltyTiers() {
    this.tiers = {
      bronze: {
        id: 'bronze',
        name: 'Bronze',
        nameLocal: 'Bronza',
        threshold: 0,
        color: '#CD7F32',
        gradient: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
        icon: '🥉',
        benefits: [
          'Earn 1 point per 100 RSD spent',
          'Access to sales 24h early',
          'Standard support'
        ],
        multiplier: 1,
        welcomeBonus: 100
      },
      silver: {
        id: 'silver',
        name: 'Silver',
        nameLocal: 'Srebro',
        threshold: 5000,
        color: '#C0C0C0',
        gradient: 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 100%)',
        icon: '🥈',
        benefits: [
          'Earn 1.25 points per 100 RSD spent',
          'Access to sales 48h early',
          'Priority support',
          'Free shipping on all orders',
          'Birthday bonus: 500 points'
        ],
        multiplier: 1.25,
        welcomeBonus: 500
      },
      gold: {
        id: 'gold',
        name: 'Gold',
        nameLocal: 'Zlato',
        threshold: 20000,
        color: '#FFD700',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        icon: '🥇',
        benefits: [
          'Earn 1.5 points per 100 RSD spent',
          'Access to sales 72h early',
          'Priority support + dedicated agent',
          'Free express shipping',
          'Birthday bonus: 2000 points',
          'Free returns & exchanges',
          'Exclusive product access'
        ],
        multiplier: 1.5,
        welcomeBonus: 2000
      },
      platinum: {
        id: 'platinum',
        name: 'Platinum',
        nameLocal: 'Platina',
        threshold: 50000,
        color: '#E5E4E2',
        gradient: 'linear-gradient(135deg, #E5E4E2 0%, #B0B0B0 100%)',
        icon: '💎',
        benefits: [
          'Earn 2 points per 100 RSD spent',
          'Early access to all launches (7 days)',
          'VIP concierge support (24/7)',
          'Free express shipping worldwide',
          'Birthday bonus: 5000 points + gift',
          'Free returns & exchanges worldwide',
          'Exclusive product co-design access',
          'Personal shopper',
          'Invitation to VIP events'
        ],
        multiplier: 2,
        welcomeBonus: 5000
      }
    }

    // User's current tier
    this.userTier = this.getUserTier();
    this.userPoints = this.getUserPoints();
  }

  static getUserTier() {
    const points = this.getUserPoints();
    const tiers = ['bronze', 'silver', 'gold', 'platinum'].reverse();
    for (const tierId of tiers) {
      if (this.getUserPoints() >= this.tiers[tierId].threshold) {
        return tierId;
      }
    }
    return 'bronze';
  }

  static getUserPoints() {
    const loyalty = JSON.parse(localStorage.getItem('dalli_loyalty') || '{}');
    return loyalty.points || 0;
  }

  static addPoints(points, source = 'purchase', metadata = {}) {
    let current = this.getUserPoints();
    const newTotal = Math.max(0, this.getUserPoints() + points);
    
    const loyalty = {
      points: newTotal,
      tier: this.getUserTier(),
      lifetimeEarned: (JSON.parse(localStorage.getItem('dalli_loyalty') || '{}').lifetimeEarned || 0) + Math.max(0, points),
      history: [
        ...(JSON.parse(localStorage.getItem('dalli_loyalty') || '{}').history || []).slice(-49),
        {
          points: points,
          source,
          timestamp: Date.now(),
          metadata
        }
      ]
    }

    localStorage.setItem('dalli_loyalty', JSON.stringify(loyalty));
    
    // Check for tier upgrade
    const newTier = this.getUserTier();
    const oldTier = localStorage.getItem('dalli_loyalty_tier') || 'bronze';
    if (loyalty.tier !== oldTier) {
      this.onTierUpgrade(loyalty.tier, oldTier);
    }
    
    localStorage.setItem('dalli_loyalty_tier', loyalty.tier);
    localStorage.setItem('dalli_loyalty', JSON.stringify(loyalty));
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('loyalty:points-change', {
      detail: { points: loyalty.points, tier: loyalty.tier, earned: points }
    }));
  }

  static getTierForPoints(points) {
    const tiers = ['platinum', 'gold', 'silver', 'bronze'];
    for (const tier of tiers) {
      if (points >= this.tiers[tier].threshold) return tier;
    }
    return 'bronze';
  }

  static onTierUpgrade(newTier, oldTier) {
    const tierData = this.tiers[newTier];
    
    // Show celebration
    this.showTierUpgradeAnimation(newTier);
    
    // Award welcome bonus
    this.addWelcomeBonus(newTier);
    
    // Show notification
    window.showToast?.(
      `🎉 Congratulations! You've reached ${this.tiers[newTier].nameLocal}! ${this.tiers[newTier].welcomeBonus} bonus points awarded!`,
      'success'
    );
    
    // Track event
    this.trackEvent('tier_upgrade', { from: oldTier, to: newTier });
  }

  static addWelcomeBonus(tierId) {
    const bonus = this.tiers[tierId].welcomeBonus;
    if (bonus > 0) {
      let current = parseInt(localStorage.getItem('dalli_loyalty_points') || '0');
      localStorage.setItem('dalli_loyalty_points', String(parseInt(localStorage.getItem('dalli_loyalty_points') || '0') + tierData.welcomeBonus));
    }
  }

  static showTierUpgradeAnimation(newTier) {
    // Create celebration animation
    const overlay = document.createElement('div');
    overlay.className = 'tier-upgrade-overlay';
    overlay.innerHTML = `
      <div class="tier-upgrade-modal">
        <div class="tier-icon">${this.tiers[newTier].icon}</div>
        <h2>Congratulations!</h2>
        <h1>${this.tiers[newTier].nameLocal}</h1>
        <p>You've reached ${this.tiers[newTier].nameLocal} tier!</h1>
        <div class="bonus-points">+${this.tiers[newTier].welcomeBonus} bonus points</div>
        <button class="btn btn-primary" onclick="this.closest('.tier-upgrade-overlay').remove()">Continue</button>
      </div>
    `;
    document.body.appendChild(document.createElement('div').appendChild(document.createElement('div')));
    document.body.appendChild(document.createElement('div'));
    document.body.appendChild(document.createElement('div'));
    
    // Actually append
    document.body.appendChild(overlay);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      overlay.style.animation = 'fadeOut 0.5s ease-out forwards';
      setTimeout(() => overlay.remove(), 500);
    }, 5000);
  }

  // ============================================================
  // POINTS SYSTEM
  // ============================================================
  static initPointsSystem() {
    // Points earning rates
    this.earningRules = {
      purchase: { baseRate: 1, description: '1 point per 100 RSD spent' },
      review: { points: 50, limit: 5, period: 'month', description: '50 points per review (max 5/month)' },
      referral: { points: 500, description: '500 points per successful referral' },
      review_photo: { points: 20, description: '20 bonus points for photo review' },
      social_share: { points: 25, limit: 3, period: 'day', description: '25 points per share (max 3/day)' },
      birthday: { points: 500, description: 'Birthday bonus points' },
      review_photo: { points: 20, description: 'Photo review bonus' },
      first_purchase: { points: 200, description: 'First purchase bonus' },
      app_install: { points: 100, description: 'Mobile app install bonus' },
      push_enable: { points: 50, description: 'Enable push notifications' },
      refer_friend: { points: 500, description: 'Refer a friend who makes a purchase' }
    }

    // Points redemption rates
    this.redemptionRates = {
      '100': { points: 100, value: 100, label: '100 RSD off' },
      '500': { points: 500, value: 500, label: '500 RSD off' },
      '1000': { points: 1000, value: 1000, label: '1,000 RSD off' },
      '2500': { points: 2500, value: 2500, label: '2,500 RSD off' },
      '5000': { points: 5000, value: 5000, label: '5,000 RSD off' },
      'free_shipping': { points: 200, value: 'free_shipping', label: 'Free shipping on next order' },
      'express_shipping': { points: 500, value: 'express_shipping', label: 'Free express shipping' },
      'gift_wrap': { points: 100, value: 'gift_wrap', label: 'Free gift wrapping' }
    }

    // Points expiration
    this.expirationPolicy = {
      enabled: true,
      monthsInactive: 12,
      warningDays: 30,
      gracePeriodDays: 30
    }
  }

  static spendPoints(points, rewardId) {
    let current = this.getUserPoints();
    if (current < points) {
      window.showToast?.('Not enough points', 'error');
      return false;
    }

    const reward = this.redemptionRates[points];
    if (!reward) {
      window.showToast?.('Invalid reward', 'error');
      return false;
    }

    // Deduct points
    current = parseInt(localStorage.getItem('dalli_loyalty_points') || '0');
    localStorage.setItem('dalli_loyalty_points', String(current - points));

    // Record redemption
    const history = JSON.parse(localStorage.getItem('dalli_loyalty_history') || '[]');
    const newEntry = {
      type: 'redemption',
      points: -points,
      reward: rewardId,
      timestamp: Date.now()
    }
    const updatedHistory = [...history.slice(-49), newEntry].slice(-50);
    localStorage.setItem('dalli_loyalty_history', JSON.stringify(updatedHistory));

    // Apply reward
    this.applyReward(rewardId);

    window.showToast?.(`Redeemed ${points} points for ${reward.label}`, 'success');
    this.updateUI();
    return true;
  }

  static getUserPointsBalance() {
    return parseInt(localStorage.getItem('dalli_loyalty_points') || '0');
  }

  static getPointsHistory() {
    return JSON.parse(localStorage.getItem('dalli_loyalty_history') || '[]');
  }

  // ============================================================
  // REFERRAL PROGRAM
  // ============================================================
  static initReferralProgram() {
    this.referralConfig = {
      referrerReward: 500, // points
      refereeDiscount: 15, // percent
      refereeMinOrder: 3000, // RSD
      maxReferralsPerUser: 50,
      referralCodeLength: 8,
      cookieDurationDays: 30
    }

    // Generate referral code
    this.generateReferralCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += Math.floor(Math.random() * 32).toString(32).toUpperCase();
      }
      return code;
    }

    // Get or create user's referral code
    this.getReferralCode = () => {
      let code = localStorage.getItem('dalli_referral_code');
      if (!code) {
        code = this.generateReferralCode();
        localStorage.setItem('dalli_referral_code', code);
      }
      return code;
    }

    // Share referral
    this.shareReferral = async (platform) => {
      const code = this.getReferralCode();
      const url = `${window.location.origin}/ref/${this.getReferralCode()}`;
      const text = `Check out DALLI! Use my code for 15% off your first order: ${this.getReferralCode()}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: 'DALLI Referral', text: `Get 15% off at DALLI with my code: ${this.getReferralCode()}`, url: window.location.origin + '/ref/' + this.getReferralCode() });
        } catch (e) {
          this.fallbackShare();
        }
      } else {
        this.fallbackShare();
      }
    }

    }

  static fallbackShare(url) {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    window.showToast?.('Link copied to clipboard!', 'success');
  }

  // Track referral
  static trackReferral(code) {
    // Store referral cookie
    document.cookie = `dalli_ref=${code}; max-age=${30*24*60*60}; path=/; SameSite=Lax`;
  }

  // Check for referral on page load
  static checkReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      this.trackReferral(ref);
    }
  }

  // ============================================================
  // ACHIEVEMENTS
  // ============================================================
  static initAchievements() {
    this.achievements = {
      'first_purchase': {
        id: 'first_purchase',
        name: 'First Purchase',
        nameLocal: 'Prva kupovina',
        description: 'Make your first purchase',
        icon: '🛍️',
        points: 200,
        condition: (user) => user.totalOrders >= 1
      },
      'big_spender': {
        id: 'big_spender',
        name: 'Big Spender',
        nameLocal: 'Veliki kupac',
        description: 'Spend over 50,000 RSD',
        icon: '💰',
        points: 1000,
        condition: (user) => user.totalSpent >= 50000
      },
      'loyal_customer': {
        id: 'loyal_customer',
        name: 'Loyal Customer',
        nameLocal: 'Verni kupac',
        description: 'Make 10 purchases',
        icon: '❤️',
        points: 500,
        condition: (user) => user.totalOrders >= 10
      },
      'reviewer': {
        id: 'reviewer',
        name: 'Reviewer',
        nameLocal: 'Recenzent',
        description: 'Write 5 reviews',
        icon: '⭐',
        points: 300,
        condition: (user) => user.reviewCount >= 5
      },
      'photo_reviewer': {
        id: 'photo_reviewer',
        name: 'Photo Reviewer',
        nameLocal: 'Foto recenzent',
        description: 'Add photos to 5 reviews',
        icon: '📸',
        points: 200,
        condition: (user) => user.photoReviewCount >= 5
      },
      'social_sharer': {
        id: 'social_sharer',
        name: 'Social Sharer',
        nameLocal: 'Delitelj',
        description: 'Share products 10 times',
        icon: '📱',
        points: 200,
        condition: (user) => user.shareCount >= 10
      },
      'referral_master': {
        id: 'referral_master',
        name: 'Referral Master',
        nameLocal: 'Majstor preporuka',
        description: 'Refer 5 friends who make a purchase',
        icon: '👥',
        points: 1000,
        condition: (user) => user.successfulReferrals >= 5
      },
      'early_adopter': {
        id: 'early_adopter',
        name: 'Early Adopter',
        nameLocal: 'Rani adoptant',
        description: 'Be among first 100 customers',
        icon: '🚀',
        points: 500,
        condition: (user) => user.customerNumber <= 100
      },
      'crypto_pioneer': {
        id: 'crypto_pioneer',
        name: 'Crypto Pioneer',
        nameLocal: 'Kripto pionir',
        description: 'Make first crypto payment',
        icon: '₿',
        points: 500,
        condition: (user) => user.hasCryptoPayment
      },
      'reviewer_pro': {
        id: 'reviewer_pro',
        name: 'Review Pro',
        nameLocal: 'Pro recenzent',
        description: 'Write 25 reviews with photos',
        icon: '📝',
        points: 1000,
        condition: (user) => user.photoReviewCount >= 25
      },
      'super_referrer': {
        id: 'super_referrer',
        name: 'Super Referrer',
        nameLocal: 'Super preporučitelj',
        description: 'Refer 25 friends who purchase',
        icon: '🌟',
        points: 5000,
        condition: (user) => user.successfulReferrals >= 25
      },
      'vip_member': {
        id: 'vip_member',
        name: 'VIP Member',
        nameLocal: 'VIP član',
        description: 'Reach Platinum tier',
        icon: '💎',
        points: 5000,
        condition: (user) => user.tier === 'platinum'
      },
      'birthday_shopper': {
        id: 'birthday_shopper',
        name: 'Birthday Shopper',
        nameLocal: 'Rođendanski kupac',
        description: 'Make a purchase on your birthday',
        icon: '🎂',
        points: 200,
        condition: (user) => user.lastOrderOnBirthday
      },
      'review_streak': {
        id: 'review_streak',
        name: 'Review Streak',
        nameLocal: 'Serija recenzija',
        description: 'Write a review for 7 consecutive purchases',
        icon: '🔥',
        points: 300,
        condition: (user) => user.reviewStreak >= 7
      }
    }

    // Check and award achievements
    this.checkAchievements = (userData) => {
      const earned = JSON.parse(localStorage.getItem('dalli_achievements') || '[]');
      const newlyEarned = [];

      for (const [id, achievement] of Object.entries(this.achievements)) {
        if (!earned.includes(achievement.id) && achievement.condition(userData)) {
          earned.push(achievement.id);
          this.awardAchievement(achievement);
        }
      }

      localStorage.setItem('dalli_achievements', JSON.stringify(earned));
      return earned;
    }

    }

  static awardAchievement(achievement) {
    // Show notification
    window.showToast?.(`🏆 Achievement Unlocked: ${achievement.nameLocal}! +${achievement.points} points`, 'success');
    
    // Add points
    this.addPoints(achievement.points, 'achievement', { achievementId: achievement.id });

    // Show animation
    this.showAchievementAnimation(achievement);
  }

  static showAchievementAnimation(achievement) {
    const modal = document.createElement('div');
    modal.className = 'achievement-unlock-overlay';
    modal.innerHTML = `
      <div class="achievement-unlock-modal">
        <div class="achievement-icon">${achievement.icon}</div>
        <h2>Achievement Unlocked!</h2>
        <h3>${achievement.nameLocal}</h3>
        <p>${achievement.description}</p>
        <div class="achievement-points">+${achievement.points} points</div>
      </div>
    `;
    document.body.appendChild(document.createElement('div')).appendChild(document.createElement('div'));
    document.body.appendChild(document.createElement('div'));
    
    document.body.appendChild(document.createElement('div'));
    
    // Actually create properly
    const overlay = document.createElement('div');
    overlay.className = 'achievement-overlay';
    overlay.innerHTML = `
      <div class="achievement-modal">
        <div class="achievement-icon">${achievement.icon}</div>
        <h2>Achievement Unlocked!</h2>
        <h3>${achievement.nameLocal}</h3>
        <p>${achievement.description}</p>
        <div class="achievement-points">+${achievement.points} points</div>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.animation = 'fadeOut 0.5s ease-out forwards';
      setTimeout(() => overlay.remove(), 500);
    }, 4000);
  }

  // ============================================================
  // VIP PERKS
  // ============================================================
  static initVIPPerks() {
    this.vipPerks = {
      bronze: [],
      silver: [
        { id: 'free_shipping', name: 'Free Standard Shipping', value: 'unlimited' },
        { id: 'early_access_24h', name: '24h Early Sale Access', value: true },
        { id: 'priority_support', name: 'Priority Support', value: true }
      ],
      gold: [
        { id: 'free_shipping', name: 'Free Standard Shipping', value: 'unlimited' },
        { id: 'express_shipping', name: 'Free Express Shipping', value: true },
        { id: 'early_access_72h', name: '72h Early Sale Access', value: true },
        { id: 'priority_support', name: 'Priority Support', value: true },
        { id: 'dedicated_agent', name: 'Dedicated Support Agent', value: true },
        { id: 'free_returns', name: 'Free Returns & Exchanges', value: true },
        { id: 'exclusive_products', name: 'Exclusive Product Access', value: true },
        { id: 'birthday_bonus', name: 'Birthday Bonus Points', value: 2000 }
      ],
      platinum: [
        { id: 'free_shipping', name: 'Free Standard Shipping', value: 'unlimited' },
        { id: 'express_shipping', name: 'Free Express Shipping Worldwide', value: true },
        { id: 'early_access_7d', name: '7-Day Early Access to Launches', value: true },
        { id: 'vip_concierge', name: 'VIP Concierge (24/7)', value: true },
        { id: 'personal_shopper', name: 'Personal Shopper', value: true },
        { id: 'free_returns_global', name: 'Free Global Returns', value: true },
        { id: 'co_design', name: 'Product Co-Design Access', value: true },
        { id: 'personal_shopper', name: 'Personal Shopper', value: true },
        { id: 'vip_events', name: 'VIP Event Invitations', value: true },
        { id: 'birthday_gift', name: 'Birthday Gift + 5000 Points', value: true },
        { id: 'dedicated_manager', name: 'Dedicated Account Manager', value: true }
      ]
    }
  }

  static getPerksForTier(tier) {
    return this.vipPerks[tier] || [];
  }

  static hasPerk(tier, perkId) {
    return this.vipPerks[tier]?.some(p => p.id === perkId) || false;
  }

  // ============================================================
  // GAMIFICATION UI
  // ============================================================
  static initGamificationUI() {
    // Loyalty dashboard widget
    this.renderLoyaltyWidget = (container) => {
      const points = this.getUserPoints();
      const tier = this.getUserTier();
      const tierData = this.tiers[this.userTier];
      const nextTier = this.getNextTier();
      const progress = this.getTierProgress();

      return `
        <div class="loyalty-widget" data-loyalty-widget>
          <div class="loyalty-header">
            <div class="tier-badge" style="background: ${this.tiers[this.userTier].gradient}">
              <span class="tier-icon">${this.tiers[this.userTier].icon}</span>
              <span class="tier-name">${this.tiers[this.userTier].nameLocal}</span>
            </div>
            <div class="points-display">
              <span class="points-value">${this.getUserPoints().toLocaleString('sr-RS')}</span>
              <span class="points-label">points</span>
            </div>
          </div>
          
          <div class="tier-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${this.getTierProgress()}%"></div>
            </div>
            <div class="progress-labels">
              <span>Current: ${this.tiers[this.userTier].nameLocal}</span>
              <span>Next: ${this.getNextTierName()} (${this.getPointsToNextTier()} pts)</span>
            </div>
          </div>

          <div class="loyalty-perks">
            <h4>Your Perks</h4>
            <ul class="perks-list">
              ${this.getPerksForTier(this.userTier).map(perk => `
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${perk.name}</li>
              `).join('')}
            </ul>
          </div>

          <div class="loyalty-actions">
            <button class="btn btn-primary btn-block" data-action="view-loyalty">View Loyalty Dashboard</button>
            <button class="btn btn-outline" data-action="redeem-points">Redeem Points</button>
            <button class="btn btn-ghost" data-action="refer-friend">Refer a Friend</button>
          </div>
        </div>
      `;
    }
  }

  static getTierProgress() {
    const currentTier = this.tiers[this.userTier];
    const nextTier = this.getNextTier();
    if (!nextTier) return 100;
    
    const currentThreshold = this.tiers[this.userTier].threshold;
    const nextThreshold = this.tiers[nextTier].threshold;
    const currentPoints = this.getUserPoints();
    
    return Math.min(100, Math.round(((this.getUserPoints() - currentTier.threshold) / (nextThreshold - currentTier.threshold)) * 100));
  }

  static getNextTier() {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = ['bronze', 'silver', 'gold', 'platinum'].indexOf(this.userTier);
    if (currentIndex >= 3) return null;
    return ['bronze', 'silver', 'gold', 'platinum'][currentIndex + 1];
  }

  static getNextTierName() {
    const next = this.getNextTier();
    return next ? this.tiers[next].nameLocal : 'Max Tier';
  }

  static getPointsToNextTier() {
    const next = this.getNextTier();
    if (!next) return 0;
    return this.tiers[next].threshold - this.getUserPoints();
  }

  static renderPointsHistory(container) {
    const history = this.getPointsHistory().slice(-10).reverse();
    
    return `
      <div class="points-history">
        <h4>Recent Activity</h4>
        <div class="points-history-list">
          ${history.map(entry => `
            <div class="history-item ${entry.points >= 0 ? 'positive' : 'negative'}">
              <div class="history-info">
                <span class="history-source">${this.getSourceLabel(entry.source)}</span>
                <time class="history-time">${this.formatRelativeTime(entry.timestamp)}</time>
              </div>
              <span class="history-points ${entry.points >= 0 ? 'positive' : 'negative'}">
                ${entry.points >= 0 ? '+' : ''}${entry.points} pts
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static getSourceLabel(source) {
    const labels = {
      'purchase': 'Purchase',
      'review': 'Review',
      'referral': 'Referral',
      'achievement': 'Achievement',
      'birthday': 'Birthday Bonus',
      'welcome': 'Welcome Bonus',
      'tier_upgrade': 'Tier Upgrade'
    }
    return labels[source] || source;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  static init() {
    this.initLoyaltyTiers();
    this.initPointsSystem();
    this.initReferralProgram();
    this.initAchievements();
    this.initVIPPerks();
    this.initGamificationUI();
    
    console.log('[LoyaltyGamification] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LoyaltyGamification.init());
} else {
  LoyaltyGamification.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LoyaltyGamification };
}

if (typeof window !== 'undefined') {
  window.LoyaltyGamification = LoyaltyGamification;
}