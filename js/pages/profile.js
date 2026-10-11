import { getCryptoDiscountValue } from '../../services/payment-incentives.js';
import { $, $$, show, hide, on, formatPrice } from '../../core/dom.js';
import { userSignal, subscribeToUser, getUser, updateUser, logoutUser } from '../../state/user.js';
import { cartSignal, subscribeToCart, getCart } from '../../state/cart.js';
import { trackEvent } from '../../features/analytics.js';

let isInitialized = false;

const LOYALTY_TIERS = [
  { id: 'member', name: 'Član', color: '#6B7280', minSpent: 0, benefits: ['Osnovni popust 10%', 'Prvi pristup akcijama'] },
  { id: 'silver', name: 'Srebro', color: '#9CA3AF', minSpent: 100000, minOrders: 3, benefits: ['Popust 12%', 'Besplatna dostava', 'Rani pristup kolekcijama', 'Specijalni poklon na rođendan'] },
  { id: 'gold', name: 'Zlato', color: '#F59E0B', minSpent: 500000, minOrders: 8, benefits: ['Popust 15%', 'Besplatna dostava + povrat', 'Prvi pristup limitiranim proizvodima', 'Dediковани support', 'Godišnji poklon'] },
  { id: 'black', name: 'Black', color: '#111827', minSpent: 1000000, minOrders: 15, benefits: ['Popust 20%', 'VIP dostava', 'Eksluzivni proizvodi', 'Personalni shopper', 'Pozivnice na događaje', 'Maksimalni popusti'] }
];

const getCurrentTier = (spent, orders) => {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    const tier = LOYALTY_TIERS[i];
    if (spent >= tier.minSpent && orders >= (tier.minOrders || 0)) {
      return tier;
    }
  }
  return LOYALTY_TIERS[0];
};

const getNextTier = (currentTierId) => {
  const currentIndex = LOYALTY_TIERS.findIndex(t => t.id === currentTierId);
  return LOYALTY_TIERS[currentIndex + 1] || null;
};

const renderProfile = (user) => {
  if (!user) return;

  // Basic info
  const nameEl = $('#profileName');
  const emailEl = $('#profileEmail');
  const avatarEl = $$('.header__btn--user svg')[0]; // avatar in header

  if (nameEl) nameEl.textContent = user.name || user.email?.split('@')[0] || 'Korisnik';
  if (emailEl) emailEl.textContent = user.email;
  
  // Update header avatar initial
  const userAvatar = $('#userDropdownAvatar');
  if (userAvatar && user.name) {
    userAvatar.textContent = user.name[0].toUpperCase();
  }
};

const renderLoyalty = (user) => {
  const loyaltyProfile = $('#loyaltyProfile');
  if (!loyaltyProfile) return;

  if (!user) {
    hide(loyaltyProfile);
    return;
  }

  show(loyaltyProfile);

  const spent = user.totalSpent || 0;
  const orders = user.orderCount || 0;
  const points = user.loyaltyPoints || 0;
  
  const currentTier = getCurrentTier(spent, orders);
  const nextTier = getNextTier(currentTier.id);

  // Tier badge
  const tierBadge = $('#loyaltyTierBadge');
  const tierName = $('#loyaltyTierName');
  if (tierBadge) {
    tierBadge.textContent = currentTier.name;
    tierBadge.style.background = `linear-gradient(135deg, ${currentTier.color}, ${adjustColor(currentTier.color, -20)})`;
  }
  if (tierName) tierName.textContent = currentTier.name;

  // Points
  const pointsEl = $('#loyaltyPoints');
  if (pointsEl) pointsEl.textContent = formatNumber(points);

  // Progress
  const progressLabel = $('#loyaltyProgressLabel');
  const progressPercent = $('#loyaltyProgressPercent');
  const progressFill = $('#loyaltyProgressFill');
  const spentEl = $('#loyaltySpent');
  const remainingEl = $('#loyaltyRemaining');

  if (nextTier) {
    const progress = Math.min(100, (spent / nextTier.minSpent) * 100);
    if (progressLabel) progressLabel.textContent = `Napredak do ${nextTier.name}`;
    if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (spentEl) spentEl.textContent = formatPrice(spent);
    if (remainingEl) remainingEl.textContent = `Preostalo: ${formatPrice(Math.max(0, nextTier.minSpent - spent))} do ${nextTier.name}`;
  } else {
    if (progressLabel) progressLabel.textContent = 'Maksimalni nivo postignut!';
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressFill) progressFill.style.width = '100%';
    if (spentEl) spentEl.textContent = formatPrice(spent);
    if (remainingEl) remainingEl.textContent = '🎉 Čestitamo! Ste na najvišem nivou.';
  }

  // Benefits
  const benefitsEl = $('#loyaltyBenefits');
  if (benefitsEl) {
    benefitsEl.innerHTML = currentTier.benefits.map(b => `<li>✓ ${b}</li>`).join('');
  }
};

const adjustColor = (hex, amount) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
};

const formatNumber = (num) => num.toLocaleString('sr-RS');

const initProfileForm = () => {
  const form = $('#profileForm');
  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();
    const data = {
      firstName: $('#profileFirstName')?.value,
      lastName: $('#profileLastName')?.value,
      email: $('#profileEmail')?.value,
      phone: $('#profilePhone')?.value
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Snimanje...';

    try {
      await updateUser(data);
      window.showToast?.('Profil ažuriran', 'success');
      trackEvent('profile_update', { fields: Object.keys(data).length });
    } catch (err) {
      window.showToast?.('Greška pri ažuriranju', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sačuvaj izmene';
    }
  });
};

const initPasswordForm = () => {
  const form = $('#passwordForm');
  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();
    const current = $('#currentPassword')?.value;
    const newPass = $('#newPassword')?.value;
    const confirm = $('#confirmPassword')?.value;

    if (newPass !== confirm) {
      window.showToast?.('Lozinke se ne podudaraju', 'error');
      return;
    }
    if (newPass.length < 8) {
      window.showToast?.('Lozinka mora imati najmanje 8 karaktera', 'error');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Promena...';

    try {
      // TODO: API call for password change
      await new Promise(r => setTimeout(r, 1000)); // Mock
      window.showToast?.('Lozinka promenjena', 'success');
      form.reset();
      trackEvent('password_change');
    } catch (err) {
      window.showToast?.('Greška', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Promeni lozinku';
    }
  });
};

const initCryptoWallet = () => {
  const toggle = $('#cryptoWalletToggle');
  if (!toggle) return;

  const user = getUser();
  if (user) {
    toggle.checked = user.cryptoWallet || false;
  }

  on(toggle, 'change', async () => {
    const enabled = toggle.checked;
    try {
      await updateUser({ cryptoWallet: enabled });
      window.showToast?.(enabled ? 'Kripto novčanik uključen — ${await getCryptoDiscountValue()}% popust na sve porudžbine' : 'Kripto novčanik isključen', 'success');
      trackEvent('crypto_wallet_toggle', { enabled });
    } catch (err) {
      toggle.checked = !enabled;
      window.showToast?.('Greška', 'error');
    }
  });
};

const initLogout = () => {
  const btn = $('#logoutBtn');
  if (!btn) return;

  on(btn, 'click', async () => {
    if (confirm('Da li ste sigurni da želite da se odjavite?')) {
      logoutUser();
      window.showToast?.('Odjavljeni ste', 'info');
      trackEvent('logout');
      setTimeout(() => window.location.href = '/', 1000);
    }
  });
};

const init = () => {
  if (isInitialized) return;

  // Subscribe to user changes
  subscribeToUser((user) => {
    renderProfile(user);
    renderLoyalty(user);
  });

  // Initial render
  const user = getUser();
  renderProfile(user);
  renderLoyalty(user);

  // Initialize forms
  initProfileForm();
  initPasswordForm();
  initCryptoWallet();
  initLogout();

  // Tab switching
  $$('.profile-tab').forEach(tab => {
    on(tab, 'click', () => {
      const target = tab.dataset.tab;
      $$('.profile-tab').forEach(t => t.classList.toggle('active', t === tab));
      $$('.profile-panel').forEach(p => {
        p.hidden = p.id !== `panel-${target}`;
      });
      trackEvent('profile_tab_switch', { tab: target });
    });
  });

  isInitialized = true;
  console.log('[Profile] Initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, renderProfile, renderLoyalty };

if (typeof window !== 'undefined') {
  window.DALLI_Profile = { init, renderProfile, renderLoyalty };
}