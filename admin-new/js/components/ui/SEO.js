/**
 * DALLI SEO Component
 * Generates JSON-LD structured data for products, organization, breadcrumbs, etc.
 * SEO-optimized with full schema.org support
 */

export class SEO {
  static init() {
    this.injectStructuredData();
    this.optimizeImages();
    this.addCanonicalLinks();
    this.addHreflangLinks();
    this.optimizeMetaTags();
  }

  static injectStructuredData() {
    // Organization schema
    this.injectOrganizationSchema();
    
    // Website schema
    this.injectWebsiteSchema();
    
    // Breadcrumb schema
    this.injectBreadcrumbSchema();
    
    // Product schemas (if on product page)
    this.injectProductSchemas();
    
    // FAQ schema (if on FAQ page)
    this.injectFAQSchema();
    
    // BreadcrumbList schema
    this.injectBreadcrumbListSchema();
  }

  static injectOrganizationSchema() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      '@id': 'https://dalli.rs/#organization',
      name: 'DALLI',
      alternateName: 'DALLI Garderoba',
      url: 'https://dalli.rs/',
      logo: { '@type': 'ImageObject', url: 'https://cdn.dalli.rs/images/logo.svg', width: 512, height: 512 },
      description: 'Premium online prodavnica garderobe - muška i ženska odela od 100% organskog pamuka. Majice, trenerke, duksevi (hoodie).',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Bulevar kralja Aleksandra 123',
        addressLocality: 'Beograd',
        postalCode: '11000',
        addressCountry: 'RS'
      },
      geo: { '@type': 'GeoCoordinates', latitude: 44.8125, longitude: 20.4612 },
      telephone: '+381-11-123-4567',
      email: 'office@dalli.rs',
      contactPoint: [
        { '@type': 'ContactPoint', telephone: '+381-11-123-4567', contactType: 'customer service', availableLanguage: ['Serbian', 'English'], hoursAvailable: 'Mo-Fr 09:00-18:00, Sa 10:00-14:00' },
        { '@type': 'ContactPoint', telephone: '+381-60-123-4567', contactType: 'technical support', availableLanguage: ['Serbian'], hoursAvailable: 'Mo-Su 08:00-22:00' }
      ],
      sameAs: [
        'https://www.facebook.com/dalli.rs',
        'https://www.instagram.com/dalli.rs',
        'https://www.tiktok.com/@dalliofficial',
        'https://twitter.com/dalli_rs',
        'https://www.youtube.com/@dalli.rs'
      ],
      currenciesAccepted: 'RSD',
      paymentAccepted: 'Cash, Credit Card, Bank Transfer, Cryptocurrency',
      priceRange: '490 - 4290 RSD',
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '09:00', closes: '18:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '14:00' }
      ],
      knowsAbout: ['organski pamuk', 'održiva moda', 'lokalna proizvodnja', 'kripto plaćanje'],
      areaServed: { '@type': 'Country', name: 'Srbija' },
      hasOfferCatalog: { '@type': 'OfferCatalog', name: 'DALLI Garderoba Katalog' }
    };

    this.injectJSONLD('organization', schema);
  }

  static injectWebsiteSchema() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://dalli.rs/#website',
      url: 'https://dalli.rs/',
      name: 'DALLI',
      description: 'Online prodaja garderobe - muška i ženska odela',
      publisher: { '@id': 'https://dalli.rs/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://dalli.rs/proizvodi/?search={search_term_string}' },
        'query-input': 'required name=search_term_string'
      },
      inLanguage: ['sr-RS', 'sr-Latn', 'sr-Cyrl', 'en']
    };
    this.injectJSONLD('website', schema);
  }

  static injectBreadcrumbSchema() {
    const breadcrumbs = this.getBreadcrumbs();
    if (!breadcrumbs.length) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
    this.injectJSONLD('breadcrumb', schema);
  }

  static getBreadcrumbs() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Početna', url: 'https://dalli.rs/' }];
    
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += '/' + segment;
      const name = segment
        .replace('.html', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      breadcrumbs.push({ name, url: `https://dalli.rs${currentPath}` });
    });
    
    return breadcrumbs;
  }

  static injectProductSchemas() {
    const productElements = document.querySelectorAll('[data-product-schema]');
    productElements.forEach(el => {
      const product = JSON.parse(el.dataset.productSchema);
      if (!product) return;

      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `https://dalli.rs/proizvod-${product.slug}.html#product`,
        sku: product.sku,
        name: product.name,
        description: product.description,
        brand: { '@type': 'Brand', name: 'DALLI' },
        category: product.category,
        image: product.images?.main ? `https://cdn.dalli.rs${product.images.main}` : undefined,
        offers: {
          '@type': 'Offer',
          '@id': `https://dalli.rs/proizvod-${product.slug}.html#offer`,
          url: `https://dalli.rs/proizvod-${product.slug}.html`,
          priceCurrency: product.currency || 'RSD',
          price: product.salePrice || product.price,
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: 'DALLI', url: 'https://dalli.rs/' },
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        aggregateRating: product.rating ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount || 0,
          bestRating: 5,
          worstRating: 1
        } : undefined,
        color: product.colors?.map(c => c.name) || [],
        size: product.sizes?.map(s => s.size || s) || [],
        material: product.material,
        gtin: product.sku,
        mpn: product.sku
      };

      // Remove undefined
      Object.keys(schema).forEach(key => schema[key] === undefined && delete schema[key]);
      
      this.injectJSONLD(`product-${product.slug}`, schema);
    });
  }

  static injectFAQSchema() {
    const faqItems = document.querySelectorAll('[data-faq]');
    if (!faqItems.length) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: Array.from(faqItems).map(item => ({
        '@type': 'Question',
        name: item.querySelector('[data-faq-question]')?.textContent || '',
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.querySelector('[data-faq-answer]')?.textContent || ''
        }
      }))
    };
    this.injectJSONLD('faq', schema);
  }

  static injectBreadcrumbListSchema() {
    const breadcrumbs = this.getBreadcrumbs();
    if (!breadcrumbs.length) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
    this.injectJSONLD('breadcrumblist', schema);
  }

  static injectJSONLD(id, schema) {
    const existing = document.getElementById(`schema-${id}`);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `schema-${id}`;
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ============================================================
  // IMAGE OPTIMIZATION
  // ============================================================
  static optimizeImages() {
    // Add loading="lazy" to images below the fold
    document.querySelectorAll('img:not([loading])').forEach(img => {
      if (!img.closest('header') && !img.closest('.hero')) {
        img.loading = 'lazy';
      }
      // Add decoding async for better performance
      if (!img.hasAttribute('decoding')) {
        img.decoding = 'async';
      }
    });

    // Add fetchpriority to hero image
    const heroImg = document.querySelector('.hero img, .hero__bg-media img');
    if (heroImg) {
      heroImg.fetchPriority = 'high';
      heroImg.loading = 'eager';
    }

    // Add width/height to prevent CLS
    document.querySelectorAll('img:not([width]):not([height])').forEach(img => {
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });
  }

  // ============================================================
  // CANONICAL LINKS
  // ============================================================
  static addCanonicalLinks() {
    // Remove existing canonical
    const existing = document.querySelector('link[rel="canonical"]');
    if (existing) existing.remove();

    // Add canonical
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = window.location.href.split('?')[0];
    document.head.appendChild(canonical);
  }

  // ============================================================
  // HREFLANG LINKS
  // ============================================================
  static addHreflangLinks() {
    const hreflangs = [
      { hreflang: 'sr-RS', href: window.location.href },
      { hreflang: 'sr-Latn', href: window.location.href },
      { hreflang: 'sr-Cyrl', href: window.location.href },
      { hreflang: 'x-default', href: window.location.href }
    ];

    // Remove existing
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    hreflangs.forEach(h => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = h.hreflang;
      link.href = h.href;
      document.head.appendChild(link);
    });
  }

  // ============================================================
  // META TAGS OPTIMIZATION
  // ============================================================
  static optimizeMetaTags() {
    // Ensure meta description exists and is optimal length
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'DALLI - Premium online garderoba. 100% organski pamuk, gramaza 180–320 g/m². Besplatna dostava nad 5.000 RSD. Plaćanje pri preuzimanju. 15% popust za kripto plaćanje. 30 dana za vraćanje.';
      document.head.appendChild(meta);
    }

    // Ensure og:title, og:description, og:image
    this.ensureOGMeta('og:title', 'DALLI - Premium Online Garderoba');
    this.ensureOGMeta('og:description', '100% organski pamuk • Besplatna dostava >5.000 RSD • 15% popust za kripto • 30 dana vraćanje');
    this.ensureOGMeta('og:image', 'https://cdn.dalli.rs/images/og/og-home-mobile.jpg');
    this.ensureOGMeta('og:image:width', '1200');
    this.ensureOGMeta('og:image:height', '630');
    this.ensureOGMeta('og:image:type', 'image/jpeg');
    this.ensureOGMeta('og:site_name', 'DALLI');
    this.ensureOGMeta('og:locale', 'sr_RS');
    this.ensureOGMeta('og:locale:alternate', 'sr_Latn');
    this.ensureOGMeta('og:locale:alternate', 'sr_Cyrl');
    this.ensureOGMeta('og:locale:alternate', 'en_US');

    // Twitter Cards
    this.ensureMeta('twitter:card', 'summary_large_image');
    this.ensureMeta('twitter:site', '@dalli_rs');
    this.ensureMeta('twitter:creator', '@dalli_rs');
    this.ensureMeta('twitter:title', 'DALLI - Premium Online Garderoba');
    this.ensureMeta('twitter:description', '100% organski pamuk • Besplatna dostava >5.000 RSD • 15% popust za kripto • 30 dana vraćanje');
    this.ensureMeta('twitter:image', 'https://cdn.dalli.rs/images/og/og-home-mobile.jpg');
    this.ensureMeta('twitter:image:alt', 'DALLI premium garderoba');
  }

  static ensureOGMeta(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  static ensureMeta(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  static init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SEO.init());
} else {
  SEO.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SEO };
}

if (typeof window !== 'undefined') {
  window.SEO = SEO;
}