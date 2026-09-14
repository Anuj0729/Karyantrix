import JsonLd from '../../components/JsonLd';
import CategoriesClient from './CategoriesClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Browse service categories',
  description: 'Explore every category of trusted, verified service providers available on Karyantrix - from home repairs to tutoring, cleaning and events.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'Browse service categories | Karyantrix',
    description: 'Explore every category of trusted, verified service providers available on Karyantrix.',
    url: '/categories',
  },
};

async function getCategories() {
  try {
    const res = await fetch(`${apiUrl}/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  const itemListJsonLd = categories.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: categories.map((cat, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${siteUrl}/categories/${cat.slug}`,
          name: cat.name,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <CategoriesClient initialCategories={categories} />
    </>
  );
}
