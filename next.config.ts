import withPWA from '@ducanh2912/next-pwa'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
}

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: { maxAgeSeconds: 60 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /\.(?:js|css|woff2?|ttf|eot|otf)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets-cache',
          expiration: { maxAgeSeconds: 7 * 24 * 60 * 60, maxEntries: 200 },
        },
      },
      {
        urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: { maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})(nextConfig)
