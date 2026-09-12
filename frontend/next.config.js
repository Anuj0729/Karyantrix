const nextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },

  async redirects() {
    return [
      { source: '/admin/categories', destination: '/admin/categories-services', permanent: false },
      { source: '/admin/services', destination: '/admin/categories-services', permanent: false },
    ];
  },
};

module.exports = nextConfig;
