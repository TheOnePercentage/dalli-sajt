/**
 * Performance Optimization Configuration
 * Core Web Vitals, Bundle Optimization, Caching Strategy, CDN, Image Optimization
 */

// ============================================================
// Vite Build Optimization Config
// ============================================================
export const vitePerformanceConfig = {
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 2
      },
      mangle: { safari10: true },
      format: { comments: false }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          'vendor-forms': ['react-hook-form', 'zod'],
          'vendor-charts': ['chart.js', 'recharts'],
          'vendor-utils': ['date-fns', 'lodash-es', 'clsx'],
          'features-auth': ['src/features/auth'],
          'features-cart': ['src/features/cart'],
          'features-checkout': ['src/features/checkout'],
          'features-account': ['src/features/account'],
          'admin-dashboard': ['admin-new/js/components/ui/AnalyticsDashboard.js'],
          'admin-products': ['admin-new/js/components/ui/ProductsTable.js'],
          'admin-orders': ['admin-new/js/components/ui/OrdersTable.js'],
          'admin-analytics': ['admin-new/js/components/ui/AnalyticsDashboard.js']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(assetInfo.name)) return `assets/images/[name]-[hash].${ext}`;
          if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) return `assets/fonts/[name]-[hash].${ext}`;
          return `assets/[ext]/[name]-[hash].${ext}`;
        }
      }
    },
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    modulePreload: { polyfill: false },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  },

  imageOptimization: {
    generateSrcSet: (imagePath, widths = [320, 640, 768, 1024, 1280, 1920]) => widths.map(w => `${imagePath}?w=${w} ${w}w`).join(', '),
    formats: ['avif', 'webp', 'jpg'],
    quality: { avif: 50, webp: 75, jpg: 80 },
    responsive: {
      breakpoints: { xs: 320, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
      sizes: {
        hero: '(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw',
        product: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw',
        thumbnail: '(max-width: 639px) 50vw, 25vw'
      }
    }
  },

  caching: {
    staticAssets: { maxAge: 31536000, immutable: true, staleWhileRevalidate: 86400 },
    html: { maxAge: 0, noCache: true, noStore: true, mustRevalidate: true },
    api: { maxAge: 0, noCache: true, noStore: true, mustRevalidate: true },
    serviceWorker: { strategy: 'stale-while-revalidate', maxAge: 86400, maxEntries: 500 },
    fonts: { maxAge: 31536000, immutable: true }
  },

  resourceHints: {
    preload: [
      { href: '/fonts/inter-var-latin.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      { href: '/fonts/inter-var-cyrillic.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      { href: '/css/critical.css', as: 'style' },
      { href: '/js/app.js', as: 'script' }
    ],
    prefetch: ['/products.html', '/muska-garderoba.html', '/zenska-garderoba.html', '/dukseri.html', '/cart.html', '/checkout.html'],
    preconnect: ['https://cdn.dalli.rs', 'https://api.dalli.rs', 'https://fonts.googleapis.com', 'https://connect.facebook.net', 'https://connect.instagram.com'],
    dnsPrefetch: ['https://fonts.googleapis.com', 'https://connect.facebook.net', 'https://connect.instagram.com', 'https://connect.tiktok.com', 'https://tag.twitter.com'],
    speculationRules: {
      prefetch: [
        { source: 'list', urls: ['/products.html', '/muska-garderoba.html', '/zenska-garderoba.html', '/dukseri.html', '/cart.html', '/checkout.html'] },
        { hrefs: ['/products.html', '/muska-garderoba.html', '/zenska-garderoba.html', '/dukseri.html', '/cart.html', '/checkout.html'] }
      ],
      prerender: [{ source: 'list', urls: ['/cart.html'] }],
      eagerness: 'moderate'
    }
  },

  bundleAnalysis: {
    maxChunkSize: 250 * 1024,
    maxInitialChunkSize: 100 * 1024,
    maxTotalSize: 2 * 1024 * 1024,
    analyzeChunks: true,
    visualizeBundle: true
  },

  images: {
    formats: ['avif', 'webp', 'jpg'],
    quality: { avif: 50, webp: 75, jpg: 80, png: 85 },
    dimensions: {
      thumbnail: { width: 150, height: 150 },
      small: { width: 320, height: 240 },
      medium: { width: 640, height: 480 },
      large: { width: 1280, height: 720 },
      hero: { width: 1920, height: 1080 }
    },
    formatsDetail: {
      avif: { quality: 50, effort: 6 },
      webp: { quality: 75, effort: 4 },
      jpeg: { quality: 80, mozjpeg: true },
      png: { quality: 80, compressionLevel: 9 }
    },
    srcsetWidths: [320, 640, 768, 1024, 1280, 1920],
    sizesMap: {
      hero: '(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw',
      product: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw',
      thumbnail: '(max-width: 639px) 50vw, 25vw'
    }
  },

  fonts: {
    fonts: [
      { family: 'Inter Variable', src: '/fonts/inter-var-latin.woff2', unicodeRange: 'U+0000-00FF, U+0100-017F, U+0180-024F, U+1E00-1EFF' },
      { family: 'Inter Variable', src: '/fonts/inter-var-cyrillic.woff2', unicodeRange: 'U+0400-04FF, U+0500-052F' }
    ],
    display: 'swap', preload: true, subset: true
  },

  criticalCSS: {
    inline: true, minify: true, extract: true,
    dimensions: [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ]
  },

  cdn: {
    enabled: true, provider: 'cloudflare', domain: 'cdn.dalli.rs',
    zones: {
      static: { path: '/assets/*', ttl: 31536000, edgeCache: true, browserCache: 31536000 },
      images: { path: '/images/*', ttl: 31536000, edgeCache: true, browserCache: 31536000, imageOptimization: true, polish: 'lossy', mirage: true },
      api: { path: '/api/*', ttl: 0, edgeCache: false, browserCache: 0 },
      html: { path: '*.html', ttl: 0, edgeCache: false, browserCache: 0 }
    },
    purgeCache: async (urls) => {}
  },

  budgets: {
    lcp: 1500, inp: 100, cls: 0.03, fcp: 1200, ttfb: 600, tbt: 100,
    budgets: [
      { type: 'initial', maximumWarning: '30kb', maximumError: '50kb' },
      { type: 'script', maximumWarning: '50kb', maximumError: '100kb' },
      { type: 'css', maximumWarning: '20kb', maximumError: '30kb' },
      { type: 'font', maximumWarning: '30kb', maximumError: '50kb' },
      { type: 'image', maximumWarning: '100kb', maximumError: '200kb' },
      { type: 'third-party', maximumWarning: '20kb', maximumError: '50kb' }
    ]
  }
};

export const performanceConfig = {
  imageOptimization: vitePerformanceConfig.imageOptimization,
  caching: vitePerformanceConfig.caching,
  resourceHints: vitePerformanceConfig.resourceHints,
  bundleAnalysis: vitePerformanceConfig.bundleAnalysis,
  images: vitePerformanceConfig.images,
  fonts: vitePerformanceConfig.fonts,
  criticalCSS: vitePerformanceConfig.criticalCSS,
  cdn: vitePerformanceConfig.cdn,
  budgets: vitePerformanceConfig.budgets
};
