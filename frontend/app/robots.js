const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/bookings',
          '/messages',
          '/messages/*',
          '/notifications',
          '/profile',
          '/provider/dashboard',
          '/provider/earnings',
          '/provider/profile',
          '/provider/profile/*',
          '/provider/wallet',
          '/support',
          '/support/*',
          '/forgot-password',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
