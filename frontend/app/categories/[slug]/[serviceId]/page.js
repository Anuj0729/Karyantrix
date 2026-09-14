import CatalogServiceDetailClient from './CatalogServiceDetailClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

async function safeGet(path) {
  try {
    const res = await fetch(`${apiUrl}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getCatalogServiceAndListings(serviceId) {
  const [catalogData, servicesData] = await Promise.all([
    safeGet(`/service-catalog?id=${serviceId}`),
    safeGet(`/services?catalog_service=${serviceId}`),
  ]);
  return {
    catalogService: catalogData?.services?.[0] || null,
    services: servicesData?.services || [],
  };
}

export async function generateMetadata({ params }) {
  const { catalogService: service } = await getCatalogServiceAndListings(params.serviceId);
  if (!service) {
    return {
      title: 'Service providers',
      description: 'Compare verified service providers on Karyantrix.',
      alternates: { canonical: `/categories/${params.slug}/${params.serviceId}` },
    };
  }

  const title = service.name;
  const description = service.description || `Compare verified providers offering ${service.name} on Karyantrix.`;

  return {
    title,
    description,
    alternates: { canonical: `/categories/${params.slug}/${params.serviceId}` },
    openGraph: { title: `${title} | Karyantrix`, description, url: `/categories/${params.slug}/${params.serviceId}` },
  };
}

export default async function CatalogServiceDetailPage({ params }) {
  const { catalogService, services } = await getCatalogServiceAndListings(params.serviceId);

  return (
    <CatalogServiceDetailClient initialCatalogService={catalogService} initialServices={services} />
  );
}
