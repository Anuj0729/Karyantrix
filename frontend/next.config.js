const nextConfig = {
  reactStrictMode: true,

   env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  compress: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { 
        protocol: 'https',
        hostname: 'i.pravatar.cc' 
      },
      { 
        protocol: 'https',
        hostname: 'images.unsplash.com' 
      },
      { 
        protocol: 'https',
        hostname: 'res.cloudinary.com' 
      },
      { 
        protocol: 'https',
        hostname: 'picsum.photos' 
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
      {
        source: '/:path(icon-.*\\.png|icon\\.png|logo\\.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { 
        source: '/admin/categories', 
        destination: '/admin/categories-services', 
        permanent: false 
      },
      { 
        source: '/admin/services', 
        destination: '/admin/categories-services', 
        permanent: false 
      },
    ];
  },

  async rewrites() {
    const apiUrl = process.env.API_URL;
    const apiOrigin = (apiUrl || '').replace(/\/api\/?$/, '');

    return [
      { 
        source: '/api/:path*', 
        destination: `${apiUrl}/:path*` 
      },
      { 
        source: '/uploads/:path*', 
        destination: `${apiOrigin}/uploads/:path*` 
      },
      { 
        source: '/socket.io/:path*', 
        destination: `${apiOrigin}/socket.io/:path*` 
      },
    ];
  },
};

module.exports = nextConfig;
