const siteUrl = process.env.NEXT_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/profile',
          '/provider/dashboard',
          '/provider/profile',
          '/login',
          '/register',
          '/forgot-password',
          '/become-provider',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
