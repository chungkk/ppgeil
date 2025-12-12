/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable compression for better performance
  compress: true,

  // Optimize images - Enhanced configuration
  images: {
    // Remote patterns (Next.js 13+) - More secure and flexible
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],

    // Image formats (AVIF is smaller than WebP, fallback to WebP, then JPEG)
    formats: ['image/avif', 'image/webp'],

    // Cache optimized images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,

    // Device sizes for responsive images (tailored to common breakpoints)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Image sizes for srcset generation
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Enable dangerous use of SVG (if needed, otherwise keep disabled for security)
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // Loader configuration (default uses Next.js built-in optimizer)
    loader: 'default',

    // Disable static imports in favor of dynamic optimization
    disableStaticImages: false,
  },

  // Performance optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Removed 'output: export' to enable API routes for authentication
  // trailingSlash: true,  // Commented out to fix Vercel API routes

  // Headers for security and caching
  async headers() {
    return [
      {
        // Cache static assets
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache audio and video files
        source: '/audio/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },

  // Rewrites for backward compatibility
  async rewrites() {
    return [
      {
        source: '/index.html',
        destination: '/',
      },
      {
        source: '/dashboard.html',
        destination: '/dashboard',
      },
      {
        source: '/auth/login.html',
        destination: '/auth/login',
      },
      {
        source: '/auth/register.html',
        destination: '/auth/register',
      },
      {
        source: '/admin/dashboard.html',
        destination: '/admin/dashboard',
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      // Redirect trailing slash for consistency
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
      // Redirect old URLs to new ones (if any)
      {
        source: '/lessons',
        destination: '/',
        permanent: true,
      },
      // Redirect www to non-www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.papageil.net',
          },
        ],
        destination: 'https://papageil.net/:path*',
        permanent: true,
      },
    ];
  },

  // Environment variables for SEO
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://papageil.net',
    NEXT_PUBLIC_SITE_NAME: 'PapaGeil',
    NEXT_PUBLIC_DEFAULT_LOCALE: 'de',
  },

  // Internationalization (i18n) configuration for SEO
  i18n: {
    locales: ['de', 'vi', 'en'],
    defaultLocale: 'de',
    localeDetection: false,
  },
}

module.exports = nextConfig
