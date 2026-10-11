import { $$, delegate } from '../core/dom.js';
import { DOM_EVENTS, emit } from '../core/events.js';

let isInitialized = false;
const TRACK_ENDPOINT = '/api/analytics/track';

const getSessionId = () => {
  try {
    let id = sessionStorage.getItem('dalli_analytics_vid');
    if (!id) {
      id = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('dalli_analytics_vid', id);
    }
    return id;
  } catch (err) {
    return null;
  }
};

const getTrafficSource = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source');
    if (utm) return utm;
    if (document.referrer) {
      try {
        return new URL(document.referrer).hostname;
      } catch (err) {
        return 'referral';
      }
    }
  } catch (err) {
    /* ignore */
  }
  return 'direct';
};

const sendToServer = payload => {
  try {
    const body = JSON.stringify({
      event: payload.event,
      path: window.location.pathname,
      referrer: document.referrer || null,
      source: getTrafficSource(),
      device: payload.device,
      vid: getSessionId(),
      productId: payload.product_id ?? payload.productId ?? null,
      query: payload.query ?? null,
      value: payload.value ?? payload.total ?? 0,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    /* never let analytics break the page */
  }
};

const trackEvent = (eventName, data = {}) => {
  const payload = {
    event: eventName,
    timestamp: Date.now(),
    device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    ...data,
  };

  if (window.dataLayer) window.dataLayer.push(payload);
  if (window.gtag) window.gtag('event', eventName, payload);
  console.log('[Analytics] Track:', payload);

  sendToServer(payload);

  emit(DOM_EVENTS.ANALYTICS_TRACK, payload);
  return payload;
};

const initGlobalTracker = () => {
  document.addEventListener('click', e => {
    const trackedEl = e.target.closest('[data-track]');
    if (!trackedEl) return;

    const trackName = trackedEl.dataset.track;
    const payload = {
      event: trackName,
      element: trackedEl.tagName.toLowerCase(),
      href: trackedEl.href || null,
      text: trackedEl.textContent?.trim().slice(0, 50) || null,
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    };

    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', trackName, payload);
    console.log('[Analytics] Track:', payload);
  });
};

const initPageViewTracking = () => {
  trackEvent('page_view', {
    page: window.location.pathname,
    referrer: document.referrer || null,
  });
};

const initScrollDepthTracking = () => {
  let maxDepth = 0;
  const milestones = [25, 50, 75, 100];
  const tracked = new Set();

  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const depth = Math.round((scrollTop / docHeight) * 100);

    if (depth > maxDepth) maxDepth = depth;

    milestones.forEach(m => {
      if (depth >= m && !tracked.has(m)) {
        tracked.add(m);
        trackEvent('scroll_depth', { depth: m, max_depth: maxDepth });
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
};

const initFormTracking = () => {
  $$('form[data-track-form]').forEach(form => {
    const formName = form.dataset.trackForm;

    form.addEventListener('submit', e => {
      trackEvent('form_submit', { form: formName });
    });

    $$('input, select, textarea', form).forEach(field => {
      let hasInteracted = false;
      field.addEventListener(
        'change',
        () => {
          if (!hasInteracted) {
            hasInteracted = true;
            trackEvent('form_field_interact', { form: formName, field: field.name || field.id });
          }
        },
        { once: true }
      );
    });
  });
};

const initSearchTracking = () => {
  const extractQuery = form => {
    const root = form || document;
    const input = root.querySelector(
      'input[type="search"], input[name="q"], input[name="query"], input[name="search"]'
    );
    return input && input.value ? input.value.trim() : '';
  };

  document.addEventListener(
    'submit',
    e => {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      const query = extractQuery(form);
      if (query) trackEvent('search', { query, form: form.id || form.className || 'search' });
    },
    true
  );

  document.addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Enter') return;
      const input = e.target.closest(
        'input[type="search"], input[name="q"], input[name="query"], input[name="search"]'
      );
      if (!input || input.closest('form')) return;
      const query = input.value ? input.value.trim() : '';
      if (query) trackEvent('search', { query, form: 'inline' });
    },
    true
  );
};

const initLinkTracking = () => {
  delegate(document, 'a[href]', 'click', (e, link) => {
    const isExternal = link.hostname !== window.location.hostname;
    const isDownload = link.hasAttribute('download') || /\.(pdf|zip|docx?|xlsx?)$/i.test(link.href);

    if (isExternal || isDownload) {
      trackEvent(isExternal ? 'external_link_click' : 'download_click', {
        url: link.href,
        text: link.textContent?.trim().slice(0, 50),
      });
    }
  });
};

const initErrorTracking = () => {
  window.addEventListener('error', e => {
    trackEvent('js_error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', e => {
    trackEvent('unhandled_promise_rejection', {
      reason: e.reason?.message || String(e.reason),
      stack: e.reason?.stack,
    });
  });
};

const initPerformanceTracking = () => {
  if ('performance' in window && 'PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'navigation') {
            trackEvent('navigation_timing', {
              dns: entry.domainLookupEnd - entry.domainLookupStart,
              tcp: entry.connectEnd - entry.connectStart,
              ttfb: entry.responseStart - entry.requestStart,
              download: entry.responseEnd - entry.responseStart,
              dom_parse: entry.domInteractive - entry.responseEnd,
              load: entry.loadEventEnd - entry.loadEventStart,
            });
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    } catch (err) {
      console.warn('[Analytics] PerformanceObserver not supported');
    }
  }
};

const init = () => {
  if (isInitialized) return;

  initGlobalTracker();
  initPageViewTracking();
  initScrollDepthTracking();
  initFormTracking();
  initSearchTracking();
  initLinkTracking();
  initErrorTracking();
  initPerformanceTracking();

  isInitialized = true;
  console.log('[Analytics] Initialized');
};

if (typeof window !== 'undefined') {
  window.DALLI_Analytics = { init, track: trackEvent };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, trackEvent };
