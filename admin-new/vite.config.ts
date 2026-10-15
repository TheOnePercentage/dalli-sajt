import { defineConfig, loadEnv } from 'vite';
import type { UserConfig, PluginOption } from 'vite';

type ViteRollupPlugins = NonNullable<
  NonNullable<UserConfig['build']>['rollupOptions']
>['plugins'];
import { resolve } from 'path';
import { builtinModules } from 'module';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';
import { createHtmlPlugin } from 'vite-plugin-html';
import { terser } from 'rollup-plugin-terser';


// CSP Injection Plugin for dev server
function cspPlugin() {
  return {
    name: "csp-injection",
    transformIndexHtml(html: string, { path }: { path: string }) {
      if (path.endsWith("index.html") || path === "/admin/") {
        const cspScript = `<script type="module">
  const nonceBytes = new Uint8Array(18);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => String.fromCharCode(b))
    .join("")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  document.documentElement.setAttribute("data-csp-nonce", nonce);

  const csp = "default-src 'self'; script-src 'self' 'nonce-" + nonce + "'; style-src 'self' 'nonce-" + nonce + "' 'unsafe-hashes'; style-src-attr 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' wss: https: http://localhost:3001 ws://localhost:3001; media-src 'self' blob:; object-src 'none'; frame-src 'self'; worker-src 'self' blob:; manifest-src 'self'; form-action 'self'; base-uri 'self'; upgrade-insecure-requests; block-all-mixed-content;";

  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = csp;
  document.head.appendChild(meta);
</script>`;
        
        return html.replace("<head>", "<head>" + cspScript);
      }
      return html;
    }
  };
}

export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isAnalyze = env['ANALYZE'] === 'true';

  return {
    root: '.',
    publicDir: 'public',
    base: env['VITE_BASE_URL'] || '/admin/',

    resolve: {
      alias: {
        '@': resolve(__dirname, 'js'),
        '@core': resolve(__dirname, 'js/core'),
        '@utils': resolve(__dirname, 'js/utils'),
        '@services': resolve(__dirname, 'js/services'),
        '@components': resolve(__dirname, 'js/components'),
        '@sections': resolve(__dirname, 'js/sections'),
        '@connectors': resolve(__dirname, 'js/connectors'),
        '@styles': resolve(__dirname, 'css'),
        '@assets': resolve(__dirname, 'assets'),
      },
    },

    css: {
      devSourcemap: true,
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@styles/variables" as *; @use "@styles/mixins" as *;`,
          api: 'modern-compiler',
        },
      },
      postcss: {
        plugins: [
          (await import('postcss-preset-env')).default({
            stage: 3,
            features: {
              'nesting-rules': true,
              'custom-properties': true,
              'color-function': true,
              'media-query-ranges': true,
            },
          }),
        ],
      },
    },

    esbuild: {
      target: 'es2022',
      legalComments: 'none',
      treeShaking: true,
      pure: isProduction ? ['console.log', 'console.debug'] : [],
      drop: isProduction ? ['debugger'] : [],
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
    },

    build: {
      target: 'es2022',
      minify: 'terser',
      sourcemap: isProduction ? 'hidden' : true,
      modulePreload: { polyfill: true },
      cssCodeSplit: true,
      cssMinify: 'esbuild',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 500,

      terserOptions: {
        compress: {
          passes: 3,
          pure_funcs: ['console.log', 'console.debug', 'console.info'],
          drop_console: isProduction,
          drop_debugger: isProduction,
          dead_code: true,
          unused: true,
        },
        mangle: {
          safari10: true,
          toplevel: true,
        },
        format: {
          comments: false,
          ecma: 2020,
        },
      },

      rollupOptions: {
        external: [...builtinModules, 'canvas', 'bufferutil', 'utf-8-validate'],
        treeshake: {
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
        output: {
          manualChunks: (id: string): string | undefined => {
            if (id.includes('node_modules')) {
              if (id.includes('chart.js') || id.includes('chartjs')) return 'vendor-charts';
              if (id.includes('date-fns') || id.includes('dayjs')) return 'vendor-date';
              if (id.includes('zod') || id.includes('valibot')) return 'vendor-validation';
              return 'vendor';
            }
            if (id.includes('/sections/')) return 'sections';
            if (id.includes('/components/')) return 'components';
            if (id.includes('/connectors/')) return 'connectors';
            if (id.includes('/services/')) return 'services';
            if (id.includes('/utils/')) return 'utils';
            if (id.includes('/core/')) return 'core';
            return undefined;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (info: { name: string | undefined }) => {
            const name = info.name ?? '';
            const ext = name.split('.').pop();
            if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/.test(name)) return `assets/img/[name]-[hash].${ext}`;
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) return `assets/fonts/[name]-[hash].${ext}`;
            if (/\.css$/.test(name)) return `assets/css/[name]-[hash].${ext}`;
            return `assets/[name]-[hash].${ext}`;
          },
        },
        plugins: [
    cspPlugin(),
          isAnalyze && visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }),
          compression({
            algorithm: 'gzip',
            exclude: [/\.(br)$/, /\.(gz)$/, /\.(map)$/],
            threshold: 1024,
            deleteOriginalAssets: false,
          }),
          compression({
            algorithm: 'brotliCompress',
            exclude: [/\.(br)$/, /\.(gz)$/, /\.(map)$/],
            threshold: 1024,
            deleteOriginalAssets: false,
          }),
        ].filter(Boolean) as unknown as ViteRollupPlugins,
      },
    },

    server: {
      host: "0.0.0.0",
      port: 0,
      strictPort: false,
      ...(env['VITE_SSL'] === 'true'
        ? {
            https: {
              key: resolve(__dirname, 'certs/localhost-key.pem'),
              cert: resolve(__dirname, 'certs/localhost.pem'),
            },
          }
        : {}),
      proxy: {
        '/api': {
          target: env['VITE_API_URL'] || 'https://dalli.rs/api',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/ws': {
          target: env['VITE_WS_URL'] || 'wss://dalli.rs/ws',
          ws: true,
        },
      },
      hmr: {
        overlay: true,
        clientPort: 8080,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },

    preview: {
      port: 4173,
      strictPort: false,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },

    optimizeDeps: {
      include: [
        'chart.js',
        'date-fns',
        'zod',
        'idb',
        'workbox-window',
      ],
      exclude: ['@imperium/admin'],
      esbuildOptions: {
        target: 'es2022',
      },
    },

    plugins: [
    cspPlugin(),
      {
        name: 'dalli-inject-asset-prefix',
        transformIndexHtml(html: string) {
          const prefix = env['VITE_BASE_URL'] || '/admin/';
          const tag = `<script>window.__ASSET_PREFIX__=${JSON.stringify(prefix)};</script>`;
          return html.replace(/<head(\s[^>]*)?>/i, (match: string) => `${match}\n    ${tag}`);
        },
      },

      createHtmlPlugin({
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyCSS: true,
          minifyJS: true,
        } : false,
        inject: {
          data: {
            title: 'DALLI Admin',
            description: 'Premium Admin Panel for DALLI E-commerce',
            themeColor: '#0f172a',
            ogImage: '/admin/assets/img/og-image.png',
            env: mode,
            buildTime: new Date().toISOString(),
            version: env['npm_package_version'] || '1.0.0',
          },
        },
      }),

      isProduction && terser({
        compress: {
          passes: 2,
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_proto: true,
        },
      }),
    ].filter(Boolean) as PluginOption[],

    define: {
      __APP_VERSION__: JSON.stringify(env['npm_package_version'] || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENV__: JSON.stringify(mode),
      __API_URL__: JSON.stringify(env['VITE_API_URL'] || '/api'),
      __WS_URL__: JSON.stringify(env['VITE_WS_URL'] || 'ws://localhost:3001'),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    experimental: {
      renderBuiltUrl(filename: string, { hostType }: { hostType: string }) {
        if (hostType === 'js') return { runtime: `window.__ASSET_PREFIX__ + ${JSON.stringify(filename)}` };
        return { relative: true };
      },
    },
  };
});