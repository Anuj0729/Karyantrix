import JsonLd from '../../../components/JsonLd';
import BlogDetailClient from './BlogDetailClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

async function getBlog(slug) {
  try {
    const res = await fetch(`${apiUrl}/blogs/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const { blog } = await res.json();
    return blog || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const blog = await getBlog(params.slug);
  if (!blog) {
    return {
      title: 'Blog post',
      description: 'Read the latest stories and updates from Karyantrix.',
      alternates: { canonical: `/blog/${params.slug}` },
    };
  }

  const description = blog.excerpt || blog.content?.slice(0, 155) || 'Read more on the Karyantrix blog.';

  return {
    title: blog.title,
    description,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: `${blog.title} | Karyantrix Blog`,
      description,
      url: `/blog/${params.slug}`,
      type: 'article',
      images: blog.cover_image ? [{ url: blog.cover_image }] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }) {
  const blog = await getBlog(params.slug);

  const articleJsonLd = blog
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.title,
        description: blog.excerpt || undefined,
        image: blog.cover_image || undefined,
        datePublished: blog.published_at || blog.createdAt,
        dateModified: blog.updatedAt || blog.published_at || blog.createdAt,
        author: blog.author?.name ? { '@type': 'Person', name: blog.author.name } : undefined,
        mainEntityOfPage: `${siteUrl}/blog/${params.slug}`,
      }
    : null;

  const breadcrumbJsonLd = blog
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
          { '@type': 'ListItem', position: 3, name: blog.title, item: `${siteUrl}/blog/${params.slug}` },
        ],
      }
    : null;

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BlogDetailClient initialBlog={blog} slug={params.slug} />
    </>
  );
}
