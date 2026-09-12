import { Suspense } from 'react';
import JsonLd from '../../components/JsonLd';
import ProvidersClient from './ProvidersClient';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Find service providers',
  description: 'Search and compare verified, background-checked service providers on Karyantrix by category, rating, price and experience.',
  alternates: { canonical: '/providers' },
  openGraph: {
    title: 'Find service providers | Karyantrix',
    description: 'Search and compare verified, background-checked service providers on Karyantrix.',
    url: '/providers',
  },
};

async function safeGet(path) {
  try {
    const res = await fetch(`${apiUrl}${path}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProvidersPage() {
  const [providersData, categoriesData] = await Promise.all([
    safeGet('/providers?page=1&limit=12'),
    safeGet('/categories'),
  ]);

  const providers = providersData?.providers || [];

  const itemListJsonLd = providers.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: providers.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${siteUrl}/providers/${p.id || p._id}`,
          name: p.name,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <Suspense fallback={null}>
        <ProvidersClient
          initialProviders={providers}
          initialCategories={categoriesData?.categories || []}
          initialCount={providersData?.count || 0}
          initialPages={providersData?.pages || 1}
        />
      </Suspense>
    </>
  );
}
