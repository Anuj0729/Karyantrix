import JsonLd from '../../../components/JsonLd';
import CategoryDetailClient from './CategoryDetailClient';

const apiUrl = process.env.NEXT_API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.NEXT_SITE_URL || 'http://localhost:3000';

async function getCategoryAndServices(slug) {
  try {
    const catRes = await fetch(`${apiUrl}/categories/${slug}`, { next: { revalidate: 300 } });
    if (!catRes.ok) return { category: null, services: [] };
    const { category } = await catRes.json();
    if (!category) return { category: null, services: [] };

    const svcRes = await fetch(`${apiUrl}/service-catalog?category_id=${category.id}`, {
      next: { revalidate: 300 },
    });
    const services = svcRes.ok ? (await svcRes.json())?.services || [] : [];

    return { category, services };
  } catch {
    return { category: null, services: [] };
  }
}

export async function generateMetadata({ params }) {
  const { category } = await getCategoryAndServices(params.slug);
  if (!category) {
    return {
      title: 'Category',
      description: 'Browse verified service providers on Karyantrix.',
      alternates: { canonical: `/categories/${params.slug}` },
    };
  }

  const title = category.name;
  const description = category.description || `Browse verified ${category.name} service providers on Karyantrix.`;

  return {
    title,
    description,
    alternates: { canonical: `/categories/${params.slug}` },
    openGraph: { title: `${title} | Karyantrix`, description, url: `/categories/${params.slug}` },
  };
}

export default async function CategoryDetailPage({ params }) {
  const { category, services } = await getCategoryAndServices(params.slug);

  const breadcrumbJsonLd = category
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Categories', item: `${siteUrl}/categories` },
          { '@type': 'ListItem', position: 3, name: category.name, item: `${siteUrl}/categories/${params.slug}` },
        ],
      }
    : null;

  const itemListJsonLd = services.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: services.map((svc, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: svc.name || svc.title,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <CategoryDetailClient initialCategory={category} initialCatalogServices={services} />
    </>
  );
}
