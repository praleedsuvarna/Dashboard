import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/mr-content': {
        target: 'http://127.0.0.1:8083',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          // Skip proxy for HTML requests
          if (req.headers.accept?.includes('text/html')) {
            console.log('MR Content - Skipping proxy for HTML request');
            return req.url;
          }
          return null;
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log the request details
            console.log('MR Content - Proxying API request:', {
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: req.body,
              target: options.target
            });

            // Forward the Authorization header
            const authHeader = req.headers['authorization'];
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
              console.log('MR Content - Forwarded Authorization header:', authHeader);
            } else {
              console.log('MR Content - No Authorization header found in request');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('MR Content - Received API response:', {
              statusCode: proxyRes.statusCode,
              headers: proxyRes.headers,
              url: req.url
            });
          });

          proxy.on('error', (err, req, res) => {
            console.error('MR Content - Proxy error:', err);
          });
        }
      },
      '/api/user-management': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => {
          const newPath = path.replace(/^\/api\/user-management/, '');
          console.log('User Management - Rewriting path:', { original: path, new: newPath });
          return newPath;
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log the request details
            console.log('User Management - Proxying request:', {
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: req.body,
              target: options.target
            });

            // Ensure Content-Type is set correctly
            proxyReq.setHeader('Content-Type', 'application/json');

            // Forward the Authorization header if present
            const authHeader = req.headers['authorization'];
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
              console.log('User Management - Forwarded Authorization header:', authHeader);
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Log the response details
            console.log('User Management - Received response:', {
              statusCode: proxyRes.statusCode,
              headers: proxyRes.headers,
              url: req.url
            });
          });

          proxy.on('error', (err, req, res) => {
            console.error('User Management - Proxy error:', err);
          });
        }
      }
    },
  },
})
