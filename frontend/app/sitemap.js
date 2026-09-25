const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
const apiUrl = process.env.API_URL || 'http://localhost:5000/api';

async function safeGet(path) {
  try {
    const res = await fetch(`${apiUrl}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function sitemap() {
  const staticRoutes = ['', '/categories', '/providers', '/blog', '/login', '/register'].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));

  const [categories, providers, blogs] = await Promise.all([
    safeGet('/categories'),
    safeGet('/providers'),
    safeGet('/blogs?limit=100'),
  ]);

  const categoryRoutes = (categories?.categories || categories || [])
    .filter((c) => c?.slug)
    .map((c) => ({
      url: `${siteUrl}/categories/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const providerRoutes = (providers?.providers || providers || [])
    .filter((p) => p?._id || p?.id)
    .map((p) => ({
      url: `${siteUrl}/providers/${p._id || p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

  const blogRoutes = (blogs?.blogs || blogs || [])
    .filter((b) => b?.slug)
    .map((b) => ({
      url: `${siteUrl}/blog/${b.slug}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

  return [...staticRoutes, ...categoryRoutes, ...providerRoutes, ...blogRoutes];
}
