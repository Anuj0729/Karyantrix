const nextConfig = {
  reactStrictMode: true,

   env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
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

  // Proxy API requests to the backend
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
