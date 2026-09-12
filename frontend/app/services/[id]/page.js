import ServiceDetailClient from './ServiceDetailClient';
import JsonLd from '../../../components/JsonLd';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function getService(id) {
  try {
    const res = await fetch(`${apiUrl}/services/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const service = data.service || data;
    return service?.title ? service : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const service = await getService(params.id);
  if (!service) {
    return {
      title: 'Service',
      description: 'Book trusted, verified services on Karyantrix.',
      alternates: { canonical: `/services/${params.id}` },
    };
  }

  const description = service.description
    ? `${service.description}`.slice(0, 155)
    : `Book ${service.title} on Karyantrix from a verified service provider.`;

  return {
    title: service.title,
    description,
    alternates: { canonical: `/services/${params.id}` },
    openGraph: { title: `${service.title} | Karyantrix`, description, url: `/services/${params.id}` },
  };
}

export default async function ServiceDetailPage({ params }) {
  const service = await getService(params.id);

  const serviceJsonLd = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.title,
        description: service.description || undefined,
        image: service.images?.[0] || undefined,
        url: `${siteUrl}/services/${params.id}`,
        category: service.category?.name || undefined,
        provider: service.provider
          ? {
              '@type': 'Person',
              name: service.provider.name,
              url: `${siteUrl}/providers/${service.provider.id}`,
            }
          : undefined,
        offers: service.price
          ? {
              '@type': 'Offer',
              priceCurrency: 'INR',
              price: service.price,
              url: `${siteUrl}/services/${params.id}`,
            }
          : undefined,
        aggregateRating: service.provider?.providerProfile?.total_reviews
          ? {
              '@type': 'AggregateRating',
              ratingValue: service.provider.providerProfile.avg_rating || 0,
              reviewCount: service.provider.providerProfile.total_reviews,
            }
          : undefined,
      }
    : null;

  return (
    <>
      <JsonLd data={serviceJsonLd} />
      <ServiceDetailClient initialService={service} />
    </>
  );
}
