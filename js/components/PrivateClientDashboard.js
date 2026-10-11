/**
 * Private Client Dashboard Component
 * Renders the luxury membership dashboard in customer profile/account area
 */

import { getTierConfig, getUserTierProgress, getMemberSince, getExclusiveBenefits, getAllTiers } from '../services/membership-engine.js';
import { getUpcomingReleases, getContentVisibilityRules, getRecommendationBoost } from '../services/exclusive-access.js';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', minimumFractionDigits: 0 }).format(amount);
}

function renderProgressBar(progress, color = '#d4a843') {
  return `
    <div style="height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden; margin-top: var(--space-2);">
      <div style="width: ${progress}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.5s ease;"></div>
    </div>
  `;
}

export async function renderPrivateClientDashboard(userProfile, containerId = 'private-client-dashboard') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const userTierId = userProfile?.membershipTier || 'member';
    const tier = getTierConfig(userTierId);
    const allTiers = getAllTiers();
    const currentIndex = allTiers.findIndex(t => t.id === userTierId);
    const isMaxTier = currentIndex >= allTiers.length - 1;

    // Get progress data
    const progress = await getUserTierProgress(userProfile, userTierId);
    const memberSince = getMemberSince(userTierId, userProfile?.memberSince);
    const exclusiveBenefits = getExclusiveBenefits(userTierId);
    const upcomingReleases = await getUpcomingReleases(userProfile?.recentProducts || [], userTierId, 5);
    const visibility = getContentVisibilityRules(userTierId);
    const boost = getRecommendationBoost(userTierId);

    const tierColor = tier?.color || '#8b95a1';
    const tierColorDark = tier?.colorDark || '#a0aab8';
    const tierIcon = tier?.icon || '🤍';
    const tierLabel = tier?.label || 'Član';

    let html = `
      <section class="private-client-dashboard" style="margin: var(--space-8) 0;" data-tier="${userTierId}">
        <!-- Membership Status Card -->
        <div class="card" style="border: 2px solid ${tierColor}; border-radius: var(--radius-xl); overflow: hidden; background: linear-gradient(135deg, ${tierColor}15 0%, ${tierColorDark}10 100%);">
          <div class="card-body" style="padding: var(--space-6); display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-6); align-items: center;">
            <div style="text-align: center; padding: var(--space-4); background: ${tierColor}20; border-radius: var(--radius-lg);">
              <div style="font-size: 3rem; line-height: 1;">${tierIcon}</div>
              <div style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--font-bold); color: ${tierColor};">${escapeHtml(tierLabel)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.1em; margin-top: var(--space-1);">${escapeHtml(tier?.name || 'Member')}</div>
            </div>

            <div>
              ${memberSince ? `
                <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Član od</div>
                <div style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--font-medium); color: var(--color-text);">${escapeHtml(memberSince.formatted)}</div>
                <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">${memberSince.months} meseci</div>
              ` : ''}

              ${!isMaxTier && progress.nextTier ? `
                <div style="margin-top: var(--space-4);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1);">
                    <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">Napredak ka ${escapeHtml(progress.nextTier.label)}</span>
                    <span style="font-size: var(--text-sm); font-weight: var(--font-bold); color: ${tierColor};">${progress.progress}%</span>
                  </div>
                  ${renderProgressBar(progress.progress, tierColor)}
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-top: var(--space-3); font-size: var(--text-xs);">
                    <div><span style="color: var(--color-text-tertiary);">Kupovina</span><br><strong>${progress.requirements.purchaseValue?.progress?.toFixed(0) || 0}%</strong></div>
                    <div><span style="color: var(--color-text-tertiary);">Narudžbine</span><br><strong>${progress.requirements.orders?.progress?.toFixed(0) || 0}%</strong></div>
                    <div><span style="color: var(--color-text-tertiary);">Poeni</span><br><strong>${progress.requirements.loyaltyPoints?.progress?.toFixed(0) || 0}%</strong></div>
                  </div>
                </div>
              ` : isMaxTier ? `
                <div style="margin-top: var(--space-4); padding: var(--space-3); background: ${tierColor}20; border-radius: var(--radius-lg); text-align: center;">
                  <div style="font-size: var(--text-sm); font-weight: var(--font-medium); color: ${tierColor};">👑 Ste na vrhu DALLI hijerarhije</div>
                </div>
              ` : ''}
            </div>

            <div style="text-align: right;">
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Ukupno potrošeno</div>
              <div style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text);">${formatCurrency(userProfile?.purchaseValue || 0)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-top: var(--space-1);">${userProfile?.orderCount || 0} narudžbina • ${userProfile?.loyaltyPoints || 0} poena</div>
            </div>
          </div>
        </div>

        <!-- Exclusive Benefits -->
        <div style="margin-top: var(--space-8);">
          <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--space-4);">Ekskluzivne Prednosti</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);">
    `;

    exclusiveBenefits.slice(0, 8).forEach(benefit => {
      html += `
        <div class="card" style="border: 1px solid var(--color-border); border-radius: var(--radius-lg); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <div class="card-body" style="padding: var(--space-4); display: flex; align-items: flex-start; gap: var(--space-3);">
            <div style="flex-shrink: 0; width: 36px; height: 36px; background: ${tierColor}15; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: ${tierColor}; font-size: 1.2rem;">✦</div>
            <div>
              <div style="font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text);">${escapeHtml(benefit.text)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-top: var(--space-1);">${escapeHtml(benefit.tier)} benefit</div>
            </div>
          </div>
        </div>
      `;
    });

    html += `
          </div>
        </div>

        <!-- Upcoming Exclusive Releases -->
        ${upcomingReleases.length > 0 ? `
          <div style="margin-top: var(--space-8);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
              <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--font-bold);">Predstojeći Ekskluzivni Izdanja</h3>
              <span class="badge" style="background: ${tierColor}20; color: ${tierColor};">${upcomingReleases.length} objava</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
        ` : ''}
    `;

    upcomingReleases.forEach(release => {
      const releaseDate = new Date(release.releaseDate);
      const daysUntil = Math.ceil((releaseDate - new Date()) / (1000 * 60 * 60 * 24));
      const img = release.images?.main || release.image || '';

      html += `
        <div class="card" style="border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; position: relative;">
          <div style="position: absolute; top: var(--space-3); right: var(--space-3); z-index: 1;">
            <span class="badge" style="background: ${tierColor}20; color: ${tierColor}; font-size: var(--text-xs);">${escapeHtml(release.accessLevel || 'member')}+</span>
          </div>
          <div style="width: 100%; aspect-ratio: 4/5; background: var(--color-bg-secondary); overflow: hidden;">
            ${img ? `<img src="${img}" alt="${escapeHtml(release.name)}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;">👔</div>'}
          </div>
          <div class="card-body" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">${escapeHtml(release.category || '')}</div>
            <h4 style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-1);">${escapeHtml(release.name)}</h4>
            <div style="font-size: var(--text-sm); font-weight: var(--font-bold); color: var(--color-primary);">${formatCurrency(release.price)}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-top: var(--space-2);">
              ${daysUntil > 0 ? `Objava za ${daysUntil} dana` : 'Dostupno'}
            </div>
          </div>
        </div>
      `;
    });

    if (upcomingReleases.length > 0) {
      html += `</div></div>`;
    }

    html += `
        <!-- Private Access Area -->
        <div style="margin-top: var(--space-8);">
          <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--space-4);">Privatni Pristup</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);">
    `;

    const privateAccessItems = [
      { icon: '📋', title: 'Pozivnice za Dogadjaje', description: 'Pregledajte i potvrdite prisustvo na VIP događajima', available: tier?.level >= 3 },
      { icon: '👁️', title: 'Predpregled Kolekcija', description: 'Rani pristup novim kolekcijama prije javnosti', available: tier?.exclusiveAccess },
      { icon: '🔒', title: 'Private Client Zbirke', description: 'Pristup kolekcijama dostupnim samo Private Client članovima', available: tier?.privateClientAccess },
      { icon: '💎', title: 'Brojana Izdanja', description: 'Garantovana alokacija na limitirane numbered edicije', available: tier?.level >= 4 },
      { icon: '🛍️', title: 'Personal Shopper', description: 'Dodeljeni personal shopper za stilski savet', available: tier?.conciergeAccess },
      { icon: '📅', title: 'Privatni Termini', description: 'Rezervišite privatni pregled u ateljeu', available: tier?.level >= 4 }
    ];

    privateAccessItems.forEach(item => {
      html += `
        <div class="card" style="border: 1px solid ${item.available ? tierColor + '40' : 'var(--color-border)'}; border-radius: var(--radius-lg); opacity: ${item.available ? '1' : '0.5'}; pointer-events: ${item.available ? 'auto' : 'none'};">
          <div class="card-body" style="padding: var(--space-4); display: flex; align-items: flex-start; gap: var(--space-3);">
            <div style="flex-shrink: 0; width: 44px; height: 44px; background: ${item.available ? tierColor + '15' : 'var(--color-bg-secondary)'}; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">${item.icon}</div>
            <div style="flex: 1;">
              <div style="font-size: var(--text-sm); font-weight: var(--font-semibold); color: ${item.available ? 'var(--color-text)' : 'var(--color-text-tertiary)'};">${escapeHtml(item.title)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-top: var(--space-1);">${escapeHtml(item.description)}</div>
              ${!item.available ? `<div style="font-size: var(--text-xs); color: ${tierColor}; margin-top: var(--space-2); font-weight: var(--font-medium);">Dostupno od ${getTierByLevel(3)?.label} tier-a</div>` : ''}
            </div>
            ${item.available ? `<div style="color: ${tierColor}; font-size: 1.2rem;">→</div>` : `<div style="color: var(--color-text-tertiary); font-size: 1.2rem;">🔒</div>`}
          </div>
        </div>
      `;
    });

    html += `
          </div>
        </div>

        <!-- Concierge Area (Future Ready) -->
        ${tier?.conciergeAccess ? `
          <div style="margin-top: var(--space-8); padding: var(--space-6); background: linear-gradient(135deg, ${tierColor}10 0%, ${tierColorDark}05 100%); border: 1px solid ${tierColor}30; border-radius: var(--radius-xl);">
            <div style="display: flex; align-items: center; gap: var(--space-4);">
              <div style="width: 56px; height: 56px; background: ${tierColor}20; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">🤵</div>
              <div>
                <h4 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text);">Concierge Servis</h4>
                <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-1);">Vaš lični asistent za sve DALLI potrebe. Dostupan 24/7 za rezervacije, stilizaciju, darove i posebne zahteve.</p>
                <button class="btn btn-primary btn-sm" style="margin-top: var(--space-3);" data-action="contact-concierge">Kontaktiraj Concierge</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Tier Upgrade Path -->
        <div style="margin-top: var(--space-8);">
          <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--space-4);">Put ka Nadogradnji</h3>
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-3); overflow-x: auto; padding-bottom: var(--space-2);">
    `;

    allTiers.forEach((t, idx) => {
      const isCurrent = t.id === userTierId;
      const isReached = idx <= currentIndex;
      const isNext = idx === currentIndex + 1;

      html += `
        <div style="flex: 0 0 auto; min-width: 160px; max-width: 200px; text-align: center;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: ${isReached ? t.color : 'var(--color-border)'}; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-2); font-size: 1.5rem; color: ${isReached ? '#fff' : 'var(--color-text-tertiary)'}; border: ${isCurrent ? `3px solid ${t.color}` : 'none'}; box-shadow: ${isCurrent ? `0 0 0 4px ${t.color}30` : 'none'};">${t.icon}</div>
          <div style="font-size: var(--text-sm); font-weight: ${isCurrent ? 'var(--font-bold)' : 'var(--font-medium)'}; color: ${isReached ? 'var(--color-text)' : 'var(--color-text-tertiary)'};">${escapeHtml(t.label)}</div>
          ${isNext ? `<div style="font-size: var(--text-xs); color: ${t.color}; margin-top: var(--space-1); font-weight: var(--font-medium);">Sledeći</div>` : ''}
          ${isReached && !isCurrent ? `<div style="font-size: var(--text-xs); color: var(--color-success); margin-top: var(--space-1);">✓ Postignuto</div>` : ''}
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </section>
    `;

    container.innerHTML = html;

    // Bind concierge button
    const conciergeBtn = container.querySelector('[data-action="contact-concierge"]');
    if (conciergeBtn) {
      conciergeBtn.addEventListener('click', () => {
        window.showToast?.('Concierge servis će biti uskoro dostupan', 'info');
      });
    }

  } catch (err) {
    console.warn('[PrivateClientDashboard] Render failed:', err);
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-tertiary);">Dashboard se ne može učitati trenutno.</div>';
  }
}

export function renderMembershipBadge(userTierId, containerId = 'membership-badge') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tier = getTierConfig(userTierId);
  if (!tier) return;

  container.innerHTML = `
    <span class="membership-badge" style="
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-3);
      background: ${tier.color}15;
      border: 1px solid ${tier.color}40;
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: ${tier.color};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    ">
      ${tier.icon} ${escapeHtml(tier.label)}
    </span>
  `;
}

export default { renderPrivateClientDashboard, renderMembershipBadge };