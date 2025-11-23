import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5002'
  const hmrProtocol = env.VITE_HMR_PROTOCOL || 'ws'
  const hmrHost = env.VITE_HMR_HOST || 'localhost'
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT || (hmrProtocol === 'wss' ? 443 : 5173))

  // Get base path from environment (for GitHub Pages deployment)
  // GitHub Pages serves from /repo-name/, so we need to set base accordingly
  const base = env.VITE_BASE ? `/${env.VITE_BASE}/` : '/'

  return {
    base: base, // Set base path for GitHub Pages
    server: {
      host: true, // allow external access (0.0.0.0)
      port: 5173,
      strictPort: true,
      allowedHosts: true, // allow all hosts (includes ngrok *.ngrok-free.dev/app)
      hmr: {
        protocol: hmrProtocol,
        host: hmrHost,
        clientPort: hmrClientPort,
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          // Increase timeout and size limits for large file uploads
          timeout: 600000, // 10 minutes
          // Ensure proper handling of multipart/form-data and range requests
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Preserve original headers for file uploads
              if (req.headers['content-type']) {
                proxyReq.setHeader('Content-Type', req.headers['content-type'])
              }
              // Preserve Range header for video streaming
              if (req.headers['range']) {
                proxyReq.setHeader('Range', req.headers['range'])
              }
              // Increase timeout for large uploads
              proxyReq.setTimeout(600000)
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Ensure CORS headers are passed through for video streaming
              if (req.url.includes('/videos/') && req.url.includes('/stream')) {
                proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || 'http://localhost:5173'
                proxyRes.headers['Access-Control-Allow-Credentials'] = 'true'
                proxyRes.headers['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Length, Content-Type'
              }
            })
          },
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // Pass credentials for authenticated image requests
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Preserve cookies for authentication
              if (req.headers.cookie) {
                proxyReq.setHeader('Cookie', req.headers.cookie)
              }
            })
          },
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Optimize build for production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.log in production
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          // Code splitting for better performance
          manualChunks: (id) => {
            // Split vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              if (id.includes('axios')) {
                return 'axios-vendor';
              }
              return 'vendor';
            }
          },
          // Optimize chunk size
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    }
  }
})

