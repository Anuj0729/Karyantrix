import JsonLd from '../../components/JsonLd';
import BlogListClient from './BlogListClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Blog',
  description:
    'Tips, guides and updates from Karyantrix — home services, provider stories and platform news, curated by our team.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog | Karyantrix',
    description: 'Tips, guides and updates from Karyantrix.',
    url: '/blog',
  },
};

async function getBlogs() {
  try {
    const res = await fetch(`${apiUrl}/blogs?limit=12`, { next: { revalidate: 300 } });
    if (!res.ok) return { blogs: [] };
    return res.json();
  } catch {
    return { blogs: [] };
  }
}

export default async function BlogPage() {
  const { blogs = [] } = await getBlogs();

  const itemListJsonLd = blogs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: blogs.map((post, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${siteUrl}/blog/${post.slug}`,
          name: post.title,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <BlogListClient initialBlogs={blogs} />
    </>
  );
}
