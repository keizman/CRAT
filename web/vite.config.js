import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html'
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js')) {
              return 'vendor-chart'
            }
            return 'vendor'
          }
          if (id.includes('components/')) {
            return 'components'
          }
          if (id.includes('api.js') || id.includes('auth.js')) {
            return 'utils'
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/img/[name]-[hash].[ext]`
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash].[ext]`
          }
          return `assets/[name]-[hash].[ext]`
        }
      }
    },
    cssCodeSplit: true,
    target: 'es2015',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['chart.js'],
    exclude: ['framer-motion']
  },
  esbuild: {
    drop: ['console', 'debugger']
  }
})
