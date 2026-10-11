/**
 * DALLI Marketing & Social Components
 * Mobile-first, SEO-optimized, Accessible
 * Components: Instagram Feed, UGC Card, Referral Card, Promo Banner, Countdown Timer, Newsletter, Share Buttons, Review Card, Trust Badges
 */

export class MarketingSocial {
  static init() {
    this.initInstagramFeed();
    this.initUGCCards();
    this.initReferralCards();
    this.initPromoBanners();
    this.initCountdownTimers();
    this.initNewsletterForms();
    this.initShareButtons();
    this.initReviewCards();
    this.initTrustBadges();
  }

  // ============================================================
  // INSTAGRAM FEED (Embed, Hashtag, Shoppable)
  // ============================================================
  static initInstagramFeed() {
    document.querySelectorAll('.instagram-feed').forEach(feed => {
      const url = feed.dataset.url;
      const limit = parseInt(feed.dataset.limit || '6', 10);
      const layout = feed.dataset.layout || 'grid'; // grid, carousel, masonry
      const showProfile = feed.dataset.showProfile !== 'false';
      const hashtag = feed.dataset.hashtag;
      const shoppable = feed.dataset.shoppable === 'true';

      if (url) {
        this.loadInstagramFeed(feed, url, limit);
      }

      // Layout classes
      feed.classList.add(`instagram-feed--${layout}`);
      if (shoppable) feed.classList.add('instagram-feed--shoppable');
    });
  }

  static loadInstagramFeed(feed, url, limit) {
    const container = feed.querySelector('.instagram-feed__items') || feed;
    const loader = feed.querySelector('.instagram-feed__loader');

    if (loader) loader.style.display = 'flex';

    fetch(`${url}?limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        container.innerHTML = data.posts.map(post => `
          <article class="instagram-post" data-post-id="${post.id}" ${post.productUrl ? `data-product-url="${post.productUrl}"` : ''}>
            <a href="${post.permalink}" target="_blank" rel="noopener noreferrer" class="instagram-post__link" aria-label="Pogledaj na Instagramu: ${post.caption?.slice(0, 50)}...">
              <picture>
                <source type="image/avif" srcset="${post.mediaUrl?.replace(/\.\w+$/, '.avif')}">
                <source type="image/webp" srcset="${post.mediaUrl?.replace(/\.\w+$/, '.webp')}">
                <img src="${post.mediaUrl}" alt="${post.caption?.slice(0, 100) || 'Instagram post'}" loading="lazy" width="300" height="300" decoding="async">
              </picture>
              ${post.productUrl ? `
                <div class="instagram-post__product-tag" data-product-url="${post.productUrl}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  Kupi
                </div>
              ` : ''}
              <div class="instagram-post__overlay">
                <div class="instagram-post__stats">
                  <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> ${post.likes?.toLocaleString('sr-RS') || '0'}</span>
                  <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5"/></svg> ${post.comments?.toLocaleString('sr-RS') || '0'}</span>
                </div>
              </div>
            </a>
            ${post.caption ? `<p class="instagram-post__caption">${post.caption}</p>` : ''}
          </article>
        `).join('');

        // Product tag clicks
        container.querySelectorAll('.instagram-post__product-tag').forEach(tag => {
          tag.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = tag.dataset.productUrl;
            if (url) window.location.href = url;
          });
        });
      })
      .catch(() => {
        feed.innerHTML = '<p class="instagram-feed__error">Nije moguće učitati Instagram feed</p>';
      })
      .finally(() => {
        if (loader) loader.style.display = 'none';
      });
  }

  // ============================================================
  // UGC CARDS (User Generated Content)
  // ============================================================
  static async initUGCCards() {
    document.querySelectorAll('.ugc-card').forEach(card => {
      const trackEvent = card.dataset.trackEvent;

      // Like button
      const likeBtn = card.querySelector('[data-ugc-like]');
      if (likeBtn) {
        likeBtn.addEventListener('click', () => {
          const countEl = card.querySelector('[data-like-count]');
          const liked = likeBtn.classList.toggle('liked');
          if (countEl) {
            countEl.textContent = parseInt(countEl.textContent) + (liked ? 1 : -1);
          }
          likeBtn.setAttribute('aria-pressed', liked);
          
          if (trackEvent && window.gtag) {
            gtag('event', 'ugc_like', { content_id: card.dataset.contentId });
          }
        });
      }

      // Share button
      const shareBtn = card.querySelector('[data-ugc-share]');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          const url = card.dataset.shareUrl || window.location.href;
          const title = card.dataset.shareTitle || 'Proverite ovaj sadržaj!';
          
          if (navigator.share) {
            try {
              await navigator.share({ title, url: window.location.href });
            } catch (e) {
              this.fallbackShare(url);
            }
          } else {
            this.fallbackShare(url);
          }
        });
      }

      // Report button
      const reportBtn = card.querySelector('[data-ugc-report]');
      if (reportBtn) {
        reportBtn.addEventListener('click', async () => {
          const confirmed = await window.ModalManager?.confirm({
  title: "Prijava sadržaja",
  message: "Da li želite da prijavite ovaj sadržaj?",
  confirmText: "Da, prijavi",
  cancelText: "Ne",
  variant: "danger"
});
if (!confirmed) {
            // Report API call
            fetch('/api/ugc/report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contentId: card.dataset.contentId })
            }).then(() => {
              window.showToast?.('Sadržaj prijavljen', 'success');
            });
          }
        });
      }

      // Expand/collapse for long content
      const expandBtn = card.querySelector('[data-ugc-expand]');
      const content = card.querySelector('[data-ugc-content]');
      if (expandBtn && content) {
        expandBtn.addEventListener('click', () => {
          const expanded = content.classList.toggle('expanded');
          expandBtn.textContent = expanded ? 'Sakrij' : 'Vidi više';
          expandBtn.setAttribute('aria-expanded', expanded);
        });
      }
    });
  }

  static fallbackShare(url) {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    window.showToast?.('Link kopiran u clipboard', 'success');
  }

  // ============================================================
  // REFERRAL CARDS (Share & Earn)
  // ============================================================
  static initReferralCards() {
    document.querySelectorAll('.referral-card').forEach(card => {
      const code = card.dataset.referralCode;
      const reward = card.dataset.reward;
      const url = `${window.location.origin}/ref/${code}`;

      // Copy code
      const copyBtn = card.querySelector('[data-referral-copy]');
      const codeEl = card.querySelector('[data-referral-code]');
      if (copyBtn && codeEl) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(code).then(() => {
            window.showToast?.('Kod kopiran! Delite sa prijateljima.', 'success');
          });
        });
      }

      // Share buttons
      card.querySelectorAll('[data-referral-share]').forEach(btn => {
        const platform = btn.dataset.platform;
        const shareUrl = `${url}?utm_source=referral&utm_medium=${platform}&utm_campaign=referral_${code}`;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          let shareUrl = '';
          switch (platform) {
            case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`; break;
            case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=Proverite%20DALLI%20garderobu!`; break;
            case 'whatsapp': shareUrl = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`; break;
            case 'viber': shareUrl = `viber://forward?text=${encodeURIComponent(shareUrl)}`; break;
            case 'messenger': shareUrl = `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`; break;
            case 'email': shareUrl = `mailto:?subject=Preporuka%20-%20DALLI&body=${encodeURIComponent('Pogledajte DALLI garderobu: ' + shareUrl)}`; break;
            case 'copy':
              navigator.clipboard.writeText(shareUrl).then(() => window.showToast?.('Link kopiran!', 'success'));
              return;
          }
          if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
        });
      });

      // Copy link
      const copyLinkBtn = card.querySelector('[data-referral-copy-link]');
      if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(url).then(() => {
            window.showToast?.('Referal link kopiran!', 'success');
          });
        });
      }
    });
  }

  // ============================================================
  // PROMO BANNERS (Dismissible, Scheduled, Geo-targeted)
  // ============================================================
  static initPromoBanners() {
    document.querySelectorAll('.promo-banner').forEach(banner => {
      const dismissBtn = banner.querySelector('[data-promo-dismiss]');
      const schedule = banner.dataset.schedule;
      const geo = banner.dataset.geo;
      const ctaUrl = banner.dataset.ctaUrl;

      // Scheduled display
      if (schedule) {
        const [start, end] = schedule.split('|').map(s => new Date(s.trim()));
        const now = new Date();
        if (now < start || now > end) {
          banner.style.display = 'none';
          return;
        }
      }

      // Geo-targeting (simplified)
      if (geo && geo !== 'all') {
        // Would check user's country via IP/GeoIP service
        // For now, assume match
      }

      // Dismiss
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          banner.style.animation = 'slideUp 0.3s ease-in reverse';
          setTimeout(() => banner.remove(), 300);
          
          // Remember dismissal
          const id = banner.dataset.promoId;
          if (id) {
            const dismissed = JSON.parse(localStorage.getItem('dismissed_promos') || '[]');
            if (!dismissed.includes(id)) {
              dismissed.push(id);
              localStorage.setItem('dismissed_promos', JSON.stringify(dismissed));
            }
          }
        });
      }

      // Check if previously dismissed
      const id = banner.dataset.promoId;
      if (id) {
        const dismissed = JSON.parse(localStorage.getItem('dismissed_promos') || '[]');
        if (dismissed.includes(id)) {
          banner.style.display = 'none';
        }
      }

      // CTA click tracking
      const cta = banner.querySelector('[data-promo-cta]');
      if (cta && ctaUrl) {
        cta.addEventListener('click', () => {
          if (window.gtag) gtag('event', 'promo_banner_click', { promo_id: banner.dataset.promoId });
        });
      }
    });
  }

  // ============================================================
  // COUNTDOWN TIMERS (Real-time, Multiple Formats)
  // ============================================================
  static initCountdownTimers() {
    document.querySelectorAll('.countdown-timer').forEach(timer => {
      const endTime = new Date(timer.dataset.endTime).getTime();
      const format = timer.dataset.format || 'dhms'; // dhms, hms, ms, s
      const onEnd = timer.dataset.onEnd; // redirect, hide, callback

      const update = () => {
        const now = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
          timer.textContent = 'Vreme je isteklo!';
          timer.classList.add('countdown-timer--ended');
          
          if (onEnd === 'redirect' && timer.dataset.redirectUrl) {
            window.location.href = timer.dataset.redirectUrl;
          } else if (onEnd === 'hide') {
            timer.style.display = 'none';
          } else if (onEnd === 'callback' && window[timer.dataset.callback]) {
            window[timer.dataset.callback]();
          }
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let html = '';
        if (format.includes('d') && days > 0) html += `<span class="countdown__part"><span class="countdown__value">${days}</span><span class="countdown__label">d</span></span>`;
        if (format.includes('h')) html += `<span class="countdown__part"><span class="countdown__value">${hours.toString().padStart(2, '0')}</span><span class="countdown__label">h</span></span>`;
        if (format.includes('m')) html += `<span class="countdown__part"><span class="countdown__value">${minutes.toString().padStart(2, '0')}</span><span class="countdown__label">m</span></span>`;
        if (format.includes('s')) html += `<span class="countdown__part"><span class="countdown__value">${seconds.toString().padStart(2, '0')}</span><span class="countdown__label">s</span></span>`;

        timer.innerHTML = html;
      };

      update();
      const interval = setInterval(update, 1000);
      timer.dataset.intervalId = interval;
    });
  }

  // ============================================================
  // NEWSLETTER FORMS (Inline, Modal, Exit Intent, Multi-step)
  // ============================================================
  static initNewsletterForms() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');
      const consentCheckbox = form.querySelector('input[name="consent"]');
      const successMessage = form.querySelector('[data-newsletter-success]');
      const multiStep = form.dataset.multistep === 'true';
      const exitIntent = form.dataset.exitIntent === 'true';
      const popupDelay = parseInt(form.dataset.popupDelay || '0', 10);

      // Multi-step
      if (multiStep) {
        const steps = form.querySelectorAll('[data-newsletter-step]');
        const nextBtns = form.querySelectorAll('[data-step-next]');
        const prevBtns = form.querySelectorAll('[data-step-prev]');
        let currentStep = 0;

        const showStep = (step) => {
          steps.forEach((s, i) => s.classList.toggle('active', i === step));
        };

        nextBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
              currentStep++;
              showStep(currentStep);
            }
          });
        });

        prevBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            if (currentStep > 0) {
              currentStep--;
              showStep(currentStep);
            }
          });
        });
      }

      // Submit
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
          window.showToast?.('Unesite validan email', 'error');
          return;
        }

        if (consentCheckbox && !consentCheckbox.checked) {
          window.showToast?.('Morate prihvatiti uslove', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Pretplaćivanje...';

        try {
          // Submit to API
          await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email, 
              consent: consentCheckbox?.checked,
              source: form.dataset.source || 'newsletter_form'
            })
          });

          if (multiStep) {
            form.querySelectorAll('[data-newsletter-step]').forEach(s => s.classList.remove('active'));
            form.querySelector('[data-newsletter-step="success"]')?.classList.add('active');
          } else if (successMessage) {
            form.style.display = 'none';
            successMessage.style.display = 'block';
          } else {
            form.reset();
            window.showToast?.('Uspešno ste se pretplatili!', 'success');
          }
        } catch (e) {
          window.showToast?.('Greška pri pretplati', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Pretplati se';
        }
      });

      // Exit intent
      if (exitIntent && !localStorage.getItem('newsletter_exit_shown')) {
        document.addEventListener('mouseleave', (e) => {
          if (e.clientY <= 0 && !localStorage.getItem('newsletter_subscribed')) {
            localStorage.setItem('newsletter_exit_shown', 'true');
            const modal = document.getElementById('newsletterExitModal');
            if (modal) modal.classList.add('open');
          }
        });
      }

      // Popup delay
      if (popupDelay > 0) {
        setTimeout(() => {
          const modal = document.getElementById(form.dataset.popupModal);
          if (modal && !localStorage.getItem('newsletter_subscribed')) {
            modal.classList.add('open');
          }
        }, popupDelay);
      }
    });

    // Success tracking
    document.querySelectorAll('[data-newsletter-success]').forEach(el => {
      if (el.style.display !== 'none') {
        if (window.gtag) gtag('event', 'newsletter_signup', { method: 'form' });
        if (window.fbq) fbq('track', 'CompleteRegistration');
      }
    });
  }

  // ============================================================
  // SHARE BUTTONS (Native, Clipboard, Social)
  // ============================================================
  static initShareButtons() {
    document.querySelectorAll('[data-share]').forEach(btn => {
      const url = btn.dataset.url || window.location.href;
      const title = btn.dataset.title || document.title;
      const text = btn.dataset.text || '';
      const platform = btn.dataset.platform;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();

        let shareUrl = '';
        switch (platform) {
          case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
          case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
            break;
          case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
            break;
          case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
            break;
          case 'viber':
            shareUrl = `viber://forward?text=${encodeURIComponent(url)}`;
            break;
          case 'messenger':
            shareUrl = `fb-messenger://share?link=${encodeURIComponent(url)}`;
            break;
          case 'email':
            shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
            break;
          case 'copy':
            await navigator.clipboard.writeText(url);
            window.showToast?.('Link kopiran u clipboard!', 'success');
            return;
          case 'native':
            if (navigator.share) {
              try {
                await navigator.share({ title, text, url });
                return;
              } catch (e) {
                // Fallback to copy
              }
            }
            break;
        }

        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
        }
      });
    });

    // Copy to clipboard utility
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy || btn.textContent;
        try {
          await navigator.clipboard.writeText(text);
          window.showToast?.('Kopirano u clipboard!', 'success');
        } catch (e) {
          window.showToast?.('Neuspešno kopiranje', 'error');
        }
      });
    });
  }

  // ============================================================
  // REVIEW CARDS (Rich Snippets, Verified, Photos)
  // ============================================================
  static initReviewCards() {
    document.querySelectorAll('.review-card').forEach(card => {
      const rating = card.dataset.rating;
      const verified = card.dataset.verified === 'true';
      const photos = JSON.parse(card.dataset.photos || '[]');

      // Star rating display
      const ratingEl = card.querySelector('[data-review-rating]');
      if (ratingEl && rating) {
        ratingEl.innerHTML = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        ratingEl.setAttribute('aria-label', `Ocena: ${rating} od 5`);
      }

      // Verified badge
      if (verified) {
        const badge = card.querySelector('[data-review-verified]');
        if (badge) badge.classList.remove('hidden');
      }

      // Photo gallery
      if (photos.length > 0) {
        const gallery = card.querySelector('[data-review-gallery]');
        if (gallery) {
          gallery.innerHTML = photos.map((photo, i) => `
            <a href="${photo.url}" class="review-photo__link" data-lightbox="review-${card.dataset.reviewId}" aria-label="Slika ${i + 1}">
              <img src="${photo.thumb}" alt="${photo.alt || 'Kupovina slika'}" loading="lazy" width="80" height="80">
            </a>
          `).join('');

          // Lightbox
          gallery.querySelectorAll('[data-lightbox]').forEach(link => {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              this.openLightbox(link.href, link.alt);
            });
          });
        }
      }

      // Helpful vote
      card.querySelectorAll('[data-review-helpful]').forEach(btn => {
        btn.addEventListener('click', () => {
          const countEl = card.querySelector('[data-helpful-count]');
          const voted = btn.classList.toggle('voted');
          if (countEl) {
            countEl.textContent = parseInt(countEl.textContent) + (voted ? 1 : -1);
          }
          btn.setAttribute('aria-pressed', voted);
          
          // API call
          fetch('/api/reviews/helpful', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewId: card.dataset.reviewId, helpful: btn.classList.contains('voted') })
          });
        });
      });
    });
  }

  static openLightbox(src, alt) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox open';
    overlay.innerHTML = `
      <button class="lightbox__close" aria-label="Zatvori">&times;</button>
      <img src="${src}" alt="${alt}" style="max-width: 90%; max-height: 90vh;">
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
      overlay.remove();
      document.body.style.overflow = '';
    };

    overlay.querySelector('.lightbox__close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  }

  // ============================================================
  // TRUST BADGES (Animated, Tooltips, Certifications)
  // ============================================================
  static initTrustBadges() {
    document.querySelectorAll('.trust-badge').forEach(badge => {
      const tooltip = badge.dataset.tooltip;
      const animation = badge.dataset.animation;
      const link = badge.dataset.link;

      // Tooltip
      if (tooltip) {
        badge.setAttribute('data-tooltip', tooltip);
        badge.setAttribute('data-tooltip-position', 'top');
      }

      // Animation
      if (animation === 'pulse') {
        badge.classList.add('trust-badge--pulse');
      } else if (animation === 'float') {
        badge.classList.add('trust-badge--float');
      } else if (animation === 'rotate') {
        badge.classList.add('trust-badge--rotate');
      }

      // Link
      if (link) {
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', () => window.open(link, '_blank'));
        badge.style.cursor = 'pointer';
      }

      // Hover effect
      badge.addEventListener('mouseenter', () => {
        badge.style.transform = 'scale(1.05)';
      });
      badge.addEventListener('mouseleave', () => {
        badge.style.transform = 'scale(1)';
      });
    });
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MarketingSocial.init());
} else {
  MarketingSocial.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MarketingSocial };
}

if (typeof window !== 'undefined') {
  window.MarketingSocial = MarketingSocial;
}