/**
 * DALLI Loyalty Integration
 * Integrates loyalty program with product pages, checkout, and personalization
 * Supports exclusive releases, tier benefits, and crypto rewards
 */

import { trackEvent } from '../features/analytics.js';
import { getUser, getUserDiscount, subscribeToUser } from '../state/user.js';

let isInitialized = false;
let loyaltyData = null;

const LOYALTY_TIERS = [
  {
    id: 'member',
    name: 'Član',
    minSpent: 0,
    minOrders: 0,
    color: '#6B7280',
    discount: 10,
    benefits: ['Osnovni popust 10%', 'Prvi pristup akcijama'],
  },
  {
    id: 'silver',
    name: 'Srebro',
    minSpent: 100000,
    minOrders: 3,
    color: '#9CA3AF',
    discount: 12,
    benefits: [
      'Popust 12%',
      'Besplatna dostava',
      'Rani pristup kolekcijama',
      'Specijalni poklon na rođendan',
    ],
  },
  {
    id: 'gold',
    name: 'Zlato',
    minSpent: 500000,
    minOrders: 8,
    color: '#F59E0B',
    discount: 15,
    benefits: [
      'Popust 15%',
      'Besplatna dostava + povrat',
      'Prvi pristup limitiranim proizvodima',
      'Dedikovani support',
      'Godišnji poklon',
    ],
  },
  {
    id: 'black',
    name: 'Black',
    minSpent: 1000000,
    minOrders: 15,
    color: '#111827',
    discount: 20,
    benefits: [
      'Popust 20%',
      'VIP dostava',
      'Ekskluzivni proizvodi',
      'Personalni shopper',
      'Pozivnice na događaje',
      'Maksimalni popusti',
    ],
  },
];

const COLLECTION_EXCLUSIVES = {
  casual: {
    label: 'Exclusive Casual Release',
    badge: 'Ekskluzivno Casual',
    tierRequired: 'silver',
    benefit: 'Rani pristup novim CASUAL komadima',
    vipBenefit: 'VIP pristup CASUAL limitiranim izdanjima',
  },
  elegance: {
    label: 'Exclusive Elegance Release',
    badge: 'Ekskluzivno Elegance',
    tierRequired: 'gold',
    benefit: 'Rani pristup novim ELEGANCE komadima',
    vipBenefit: 'VIP pristup ELEGANCE kolekciji i revijama',
  },
};

const getCollectionExclusive = collection => COLLECTION_EXCLUSIVES[collection] || null;

const hasCollectionAccess = (collection, user = getUser()) => {
  const rule = getCollectionExclusive(collection);
  if (!rule) return true;
  const userTier = user?.loyaltyTier || 'member';
  const ruleIndex = LOYALTY_TIERS.findIndex(t => t.id === rule.tierRequired);
  const userIndex = LOYALTY_TIERS.findIndex(t => t.id === userTier);
  return userIndex >= ruleIndex;
};

const getCurrentTier = (spent, orders) => {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    const tier = LOYALTY_TIERS[i];
    if (spent >= tier.minSpent && orders >= (tier.minOrders || 0)) {
      return tier;
    }
  }
  return LOYALTY_TIERS[0];
};

const getNextTier = currentTierId => {
  const currentIndex = LOYALTY_TIERS.findIndex(t => t.id === currentTierId);
  return LOYALTY_TIERS[currentIndex + 1] || null;
};

const calculateProgress = (tier, spent) => {
  const nextTier = getNextTier(tier.id);
  if (!nextTier) return { progress: 100, remaining: 0, nextTier: null };
  const progress = Math.min(100, (spent / nextTier.minSpent) * 100);
  const remaining = Math.max(0, nextTier.minSpent - spent);
  return { progress, remaining, nextTier: nextTier.name };
};

const renderLoyaltyProfile = user => {
  const loyaltyProfile = document.getElementById('loyaltyProfile');
  if (!loyaltyProfile) return;

  if (!user) {
    loyaltyProfile.classList.add('hidden');
    return;
  }

  loyaltyProfile.classList.remove('hidden');

  const spent = user.totalSpent || 0;
  const orders = user.orderCount || 0;
  const points = user.loyaltyPoints || 0;

  const currentTier = getCurrentTier(spent, orders);
  const nextTier = getNextTier(currentTier.id);
  const progressData = calculateProgress(currentTier, spent);

  // Tier badge
  const tierBadge = document.getElementById('loyaltyTierBadge');
  const tierName = document.getElementById('loyaltyTierName');
  if (tierBadge) {
    tierBadge.textContent = currentTier.name;
    tierBadge.style.background = `linear-gradient(135deg, ${currentTier.color}, ${adjustColor(currentTier.color, -20)})`;
  }
  if (tierName) tierName.textContent = currentTier.name;

  // Points
  const pointsEl = document.getElementById('loyaltyPoints');
  if (pointsEl) pointsEl.textContent = points.toLocaleString('sr-RS');

  // Progress bar
  const progressLabel = document.getElementById('loyaltyProgressLabel');
  const progressPercent = document.getElementById('loyaltyProgressPercent');
  const progressFill = document.getElementById('loyaltyProgressFill');
  const spentEl = document.getElementById('loyaltySpent');
  const remainingEl = document.getElementById('loyaltyRemaining');

  if (nextTier) {
    if (progressLabel) progressLabel.textContent = `Napredak do ${nextTier.name}`;
    if (progressPercent) progressPercent.textContent = `${Math.round(progressData.progress)}%`;
    if (progressFill) progressFill.style.width = `${progressData.progress}%`;
    if (spentEl) spentEl.textContent = spent.toLocaleString('sr-RS');
    if (remainingEl)
      remainingEl.textContent = `Preostalo: ${progressData.remaining.toLocaleString('sr-RS')} RSD do ${nextTier.name}`;
  } else {
    if (progressLabel) progressLabel.textContent = 'Maksimalni nivo postignut!';
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressFill) progressFill.style.width = '100%';
    if (spentEl) spentEl.textContent = spent.toLocaleString('sr-RS');
    if (remainingEl) remainingEl.textContent = '🎉 Čestitamo! Ste na najvišem nivou.';
  }

  // Benefits
  const benefitsEl = document.getElementById('loyaltyBenefits');
  if (benefitsEl) {
    benefitsEl.innerHTML = currentTier.benefits.map(b => `<li>✓ ${b}</li>`).join('');
  }
};

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const initLoyaltyProfile = () => {
  const user = getUser();
  renderLoyaltyProfile(user);

  // Subscribe to user changes
  subscribeToUser(user => {
    renderLoyaltyProfile(user);
  });
};

const initLoyaltyBadge = () => {
  const badges = document.querySelectorAll('[data-loyalty-badge]');
  badges.forEach(badge => {
    const tier = badge.dataset.loyaltyBadge;
    const tierData = LOYALTY_TIERS.find(t => t.id === tier);
    if (tierData) {
      badge.textContent = tierData.name;
      badge.style.background = `linear-gradient(135deg, ${tierData.color}, ${adjustColor(tierData.color, -20)})`;
      badge.style.color = 'white';
      badge.style.padding = 'var(--space-1) var(--space-2)';
      badge.style.borderRadius = 'var(--radius-full)';
      badge.style.fontSize = 'var(--text-xs)';
      badge.style.fontWeight = 'var(--fw-semibold)';
      badge.style.textTransform = 'uppercase';
      badge.style.letterSpacing = '0.05em';
    }
  });
};

const initMemberOnlyProducts = () => {
  const memberOnlyProducts = document.querySelectorAll('[data-member-only]');
  const user = getUser();
  const userTier = user?.loyaltyTier || 'member';

  memberOnlyProducts.forEach(el => {
    const requiredTier = el.dataset.memberOnly;
    const tierIndex = LOYALTY_TIERS.findIndex(t => t.id === requiredTier);
    const userTierIndex = LOYALTY_TIERS.findIndex(t => t.id === userTier);

    if (userTierIndex < tierIndex) {
      el.classList.add('member-only-locked');
      const badge = document.createElement('span');
      badge.className = 'member-only-badge';
      badge.textContent = `Samo za ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}+`;
      badge.style.cssText =
        'background: var(--color-primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;';
      el.prepend(badge);
    }
  });
};

const initEarlyAccess = () => {
  const earlyAccessProducts = document.querySelectorAll('[data-early-access]');
  const user = getUser();

  earlyAccessProducts.forEach(el => {
    const earlyAccessDate = el.dataset.earlyAccess;
    const isEarly = earlyAccessDate && new Date(earlyAccessDate) > new Date();

    if (isEarly && user?.loyaltyTier === 'member') {
      el.classList.add('early-access-locked');
      const badge = document.createElement('span');
      badge.className = 'early-access-badge';
      badge.textContent = 'Rani pristup za Silver+';
      badge.style.cssText =
        'background: var(--color-warning); color: #1a1a1a; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;';
      el.prepend(badge);
    }
  });
};

const initCollectionExclusives = () => {
  const els = document.querySelectorAll('[data-collection-exclusive]');
  if (!els.length) return;

  const user = getUser();
  els.forEach(el => {
    const collection = el.dataset.collectionExclusive || el.dataset.collection;
    const rule = getCollectionExclusive(collection);
    if (!rule) return;

    const releaseDate = el.dataset.earlyAccess || el.dataset.releaseDate;
    const isFuture = releaseDate && new Date(releaseDate) > new Date();
    const hasAccess = hasCollectionAccess(collection, user);

    el.dataset.collectionExclusiveRule = rule.tierRequired;

    if (!hasAccess) {
      el.classList.add('collection-exclusive-locked', 'member-only-locked');
      const badge = document.createElement('span');
      badge.className = 'collection-exclusive-badge';
      badge.textContent = `Samo za ${rule.tierRequired.charAt(0).toUpperCase() + rule.tierRequired.slice(1)}+`;
      badge.style.cssText =
        'background: var(--color-primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;';
      el.prepend(badge);
    } else if (isFuture) {
      el.classList.add('collection-exclusive-early');
      const badge = document.createElement('span');
      badge.className = 'collection-exclusive-badge';
      badge.textContent = rule.badge;
      badge.style.cssText =
        'background: var(--color-warning, #F59E0B); color: #1a1a1a; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;';
      el.prepend(badge);
    }

    trackLoyaltyEvent('collection_exclusive_view', { collection, hasAccess, isFuture });
  });
};

const initCryptoWalletToggle = () => {
  const toggle = document.getElementById('cryptoWalletToggle');
  if (!toggle) return;

  const user = getUser();
  if (user) {
    toggle.checked = user.cryptoWallet || false;
  }

  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    try {
      // This would call an API to update user's crypto wallet status
      // For now, just update local state
      const user = getUser();
      if (user) {
        user.cryptoWallet = enabled;
        localStorage.setItem('dalli_user', JSON.stringify(user));
      }
      window.showToast?.(
        enabled
          ? 'Kripto novčanik uključen — 15% popust na sve porudžbine'
          : 'Kripto novčanik isključen',
        'success'
      );
      trackEvent('crypto_wallet_toggle', { enabled });
    } catch (err) {
      toggle.checked = !enabled;
      window.showToast?.('Greška', 'error');
    }
  });
};

const initLoyaltyExclusiveReleases = () => {
  // Check for exclusive releases
  const exclusiveBanner = document.getElementById('exclusiveReleaseBanner');
  if (!exclusiveBanner) return;

  const user = getUser();
  const userTier = user?.loyaltyTier || 'member';
  const tierIndex = LOYALTY_TIERS.findIndex(t => t.id === userTier);

  // Check if user has access to any exclusive releases
  const hasExclusiveAccess = tierIndex >= LOYALTY_TIERS.findIndex(t => t.id === 'silver');

  if (!hasExclusiveAccess) {
    exclusiveBanner.innerHTML = `
      <div class="exclusive-banner locked">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Ekskluzivni izdanja dostupna su od Silver nivoa. <a href="/profile.html#loyalty">Učlani se</a> za pristup.</span>
      </div>
    `;
  }
};

const initProfileLoyalty = () => {
  const user = getUser();
  if (!user) return;

  // Update loyalty tier display in profile
  const spent = user.totalSpent || 0;
  const orders = user.orderCount || 0;
  const points = user.loyaltyPoints || 0;

  const currentTier = getCurrentTier(spent, orders);
  const nextTier = getNextTier(currentTier.id);
  const progressData = calculateProgress(currentTier, spent);

  // Update UI elements
  const tierBadge = document.getElementById('loyaltyTierBadge');
  const tierName = document.getElementById('loyaltyTierName');
  const pointsEl = document.getElementById('loyaltyPoints');
  const progressFill = document.getElementById('loyaltyProgressFill');
  const progressPercent = document.getElementById('loyaltyProgressPercent');
  const spentEl = document.getElementById('loyaltySpent');
  const remainingEl = document.getElementById('loyaltyRemaining');
  const benefitsEl = document.getElementById('loyaltyBenefits');

  if (tierBadge) {
    tierBadge.textContent = currentTier.name;
    tierBadge.style.background = `linear-gradient(135deg, ${currentTier.color}, ${adjustColor(currentTier.color, -20)})`;
  }
  if (tierName) tierName.textContent = currentTier.name;
  if (pointsEl) pointsEl.textContent = points.toLocaleString('sr-RS');

  if (nextTier) {
    if (document.getElementById('loyaltyProgressLabel')) {
      document.getElementById('loyaltyProgressLabel').textContent = `Napredak do ${nextTier.name}`;
    }
    if (document.getElementById('loyaltyProgressPercent')) {
      document.getElementById('loyaltyProgressPercent').textContent =
        `${Math.round(progressData.progress)}%`;
    }
    if (progressFill) progressFill.style.width = `${progressData.progress}%`;
    if (spentEl) spentEl.textContent = spent.toLocaleString('sr-RS');
    if (remainingEl)
      remainingEl.textContent = `Preostalo: ${progressData.remaining.toLocaleString('sr-RS')} RSD do ${nextTier.name}`;
  } else {
    if (document.getElementById('loyaltyProgressLabel'))
      document.getElementById('loyaltyProgressLabel').textContent = 'Maksimalni nivo postignut!';
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressFill) progressFill.style.width = '100%';
    if (spentEl) spentEl.textContent = spent.toLocaleString('sr-RS');
    if (remainingEl) remainingEl.textContent = '🎉 Čestitamo! Ste na najvišem nivou.';
  }

  if (benefitsEl) {
    benefitsEl.innerHTML = currentTier.benefits.map(b => `<li>✓ ${b}</li>`).join('');
  }
};

const initCheckoutLoyaltyDiscount = () => {
  // Apply loyalty discount in checkout summary
  const user = getUser();
  if (!user) return;

  const discount = getUserDiscount(); // from user state
  if (discount > 0) {
    const discountRow = document.getElementById('checkoutLoyaltyDiscount');
    const discountAmount = document.getElementById('checkoutLoyaltyDiscountAmount');
    const subtotal = parseInt(
      document.getElementById('summarySubtotal')?.textContent?.replace(/\D/g, '') || '0'
    );

    if (discountRow && discountAmount && subtotal > 0) {
      const discountAmountValue = Math.round(subtotal * (discount / 100));
      discountRow.classList.remove('hidden');
      discountAmount.textContent = `-${discountAmountValue.toLocaleString('sr-RS')} RSD`;

      // Update total
      const totalEl = document.getElementById('summaryTotal');
      if (totalEl) {
        const shipping = parseInt(
          document.getElementById('summaryShipping')?.textContent?.replace(/\D/g, '') || '0'
        );
        const cryptoDiscount = parseInt(
          document.getElementById('summaryDiscount')?.textContent?.replace(/\D/g, '') || '0'
        );
        const newTotal = subtotal + shipping - cryptoDiscount - discountAmountValue;
        totalEl.textContent = newTotal.toLocaleString('sr-RS') + ' RSD';
      }
    }
  }
};

const trackLoyaltyEvent = (eventName, data = {}) => {
  trackEvent(`loyalty_${eventName}`, data);
};

const initLoyalty = () => {
  if (isInitialized) return;

  initLoyaltyProfile();
  initLoyaltyBadge();
  initMemberOnlyProducts();
  initEarlyAccess();
  initCollectionExclusives();
  initCryptoWalletToggle();
  initLoyaltyExclusiveReleases();
  initProfileLoyalty();
  initCheckoutLoyaltyDiscount();

  // Subscribe to user changes
  import('../state/user.js').then(({ subscribeToUser }) => {
    subscribeToUser(user => {
      const spent = user?.totalSpent || 0;
      const orders = user?.orderCount || 0;
      const currentTier = getCurrentTier(spent, user.orderCount || 0);
      const nextTier = getNextTier(currentTier.id);
      const progressData = calculateProgress(currentTier, spent);

      // Update UI reactively
      if (document.getElementById('loyaltyProgressFill')) {
        document.getElementById('loyaltyProgressFill').style.width = `${progressData.progress}%`;
      }
      if (document.getElementById('loyaltyProgressPercent')) {
        document.getElementById('loyaltyProgressPercent').textContent =
          `${Math.round(progressData.progress)}%`;
      }
    });
  });

  isInitialized = true;
  console.log('[Loyalty] Initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoyalty);
} else {
  initLoyalty();
}

if (typeof window !== 'undefined') {
  window.DALLI_Loyalty = {
    initLoyalty,
    getCurrentTier,
    getNextTier,
    calculateProgress,
    LOYALTY_TIERS,
    COLLECTION_EXCLUSIVES,
    getCollectionExclusive,
    hasCollectionAccess,
    trackLoyaltyEvent,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initLoyalty, getCurrentTier, getNextTier, calculateProgress, LOYALTY_TIERS };
}
