import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { vitePerformanceConfig, performanceConfig } from './performance.config';

// Plugin to ignore admin-new folder during dev
function ignoreAdminNew() {
  return {
    name: 'ignore-admin-new',
    enforce: 'pre',
    resolveId(id) {
      if (id.includes('/admin-new/')) {
        return { id, external: true };
      }
    },
    load(id) {
      if (id.includes('/admin-new/')) {
        return 'export default {}';
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.includes('/admin-new/')) {
          res.statusCode = 404;
          return res.end('Not found');
        }
        next();
      });
    }
  };
}

export default defineConfig({
  publicDir: 'public',
  esbuild: {
    jsx: false,
    exclude: [/ProductGallery\.js/, /node_modules/]
  },
  plugins: [
    // React Islands — transformuje SAMO .jsx islands moduli; legacy .jsx fajlovi
    // (js/app.jsx, VirtualTryOnUpload.jsx) su vanilla JS sa ne-intentional JSX,
    // pa ih isključujemo da se njihovo ponašanje ne menja.
    react({
      include: /\.[jt]sx$/,
      exclude: [/js[/\\]app\.jsx/, /VirtualTryOnUpload\.jsx/],
      fastRefresh: false
    }),
    ignoreAdminNew(),
    VitePWA({
      registerType: 'autoUpdate',
      importWorkboxFrom: 'local',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.svg'],
      manifest: {
        name: 'DALLI - Premium Online Garderoba',
        short_name: 'DALLI',
        description: 'Muška i ženska odela od 100% organskog pamuka. Besplatna dostava nad 5.000 RSD. 15% popust sa kripto plaćanjem.',
        theme_color: '#1a1a2e',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/images/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Muška Garderoba',
            short_name: 'Muška',
            description: 'Pregledaj mušku garderobu',
            url: '/muska-garderoba.html',
            icons: [{ src: '/images/icons/muska-shortcut.png', sizes: '192x192' }]
          },
          {
            name: 'Ženska Garderoba',
            short_name: 'Ženska',
            description: 'Pregledaj žensku garderobu',
            url: '/zenska-garderoba.html',
            icons: [{ src: '/images/icons/zenska-shortcut.png', sizes: '192x192' }]
          },
          {
            name: 'Korpa',
            short_name: 'Korpa',
            description: 'Otvorite svoju korpu',
            url: '/cart.html',
            icons: [{ src: '/images/icons/cart-shortcut.png', sizes: '192x192' }]
          }
        ],
        categories: ['shopping', 'lifestyle'],
        screenshots: [
          {
            src: '/images/screenshots/home-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'DALLI Homepage - Mobile'
          },
          {
            src: '/images/screenshots/home-desktop.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'DALLI Homepage - Desktop'
          }
        ],
        prefer_related_applications: false
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot,webp,avif,json,xml,txt}'
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.dalli\.rs\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/products\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'products-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/images\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/]
      }
    }),
    // Bundle analyzer for production builds
    process.env.ANALYZE ? [(async () => {
      const { visualizer } = await import('rollup-plugin-visualizer');
      return visualizer({
        filename: 'bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      });
    })()] : []
  ],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      external: ["@netlify/blobs"]
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
rollupOptions: {
        input: {
          main: './index.html',
          cart: './cart.html',
          checkout: './checkout.html',
          profile: './profile.html',
          orders: './orders.html',
          wishlist: './wishlist.html',
          settings: './settings.html',
          'size-guide': './size-guide/index.html',
          blog: './blog-index.html',
          'blog-entry': './js/blog/blog-index-entry.js',
          // Virtual Try-On - lazy loaded module (dynamic import)
          'virtual-tryon': './js/modules/VirtualTryOnLoader.js'
        },
        output: {
          manualChunks: (id) => {
            // React Islands runtime — izdvaja se u zaseban chunk koji se učitava
            // SAMO dinamičkim import-om (kada na stranici postoji [data-island]).
            // Time obične MPA stranice ne pate od React byte-ova u initial load.
            if (id.includes('/react/') || id.includes('/react-dom') || id.includes('/scheduler/') || id.includes('/jsx-runtime/')) {
              return 'react-islands';
            }
            // Core modules
            if (id.includes('/core/')) {
              return 'core';
            }
            // State modules
            if (id.includes('/state/')) {
              return 'state';
            }
            // Feature modules
            if (id.includes('/features/')) {
              return 'features';
            }
            // Page modules
            if (id.includes('/pages/')) {
              return 'pages';
            }
            // Lazy-loaded modules (VTO, Product360)
            if (id.includes('VirtualTryOnLoader') || id.includes('virtual-tryon') || 
                id.includes('Product360Loader') || id.includes('product360')) {
              return 'lazy-features';
            }
            // Vendor (node_modules)
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            return null; // Let each entry create its own chunk
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            return `assets/[ext]/[name]-[hash].${ext}`;
          }
        }
      },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    cssMinify: true
  },
  server: {
    port: 8000,
    open: true,
    hmr: false,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },
  preview: {
    port: 8080
  }
});