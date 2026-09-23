import JsonLd from '../../../../../components/JsonLd';
import PortfolioDetailClient from './PortfolioDetailClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

async function getProvider(id) {
  try {
    const res = await fetch(`${apiUrl}/providers/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const provider = data.provider || data;
    return provider?.name ? provider : null;
  } catch {
    return null;
  }
}

function findPortfolioItem(provider, portfolioId) {
  const portfolio = provider?.providerProfile?.portfolio || [];
  return portfolio.find((item) => String(item.id || item._id) === String(portfolioId)) || null;
}

export async function generateMetadata({ params }) {
  const provider = await getProvider(params.id);
  const item = findPortfolioItem(provider, params.portfolioId);

  if (!provider || !item) {
    return {
      title: 'Portfolio work',
      description: "View this provider's completed work on Karyantrix.",
      alternates: { canonical: `/providers/${params.id}/portfolio/${params.portfolioId}` },
    };
  }

  const title = item.title || `${provider.name}'s portfolio work`;
  const description = item.description
    ? `${item.description}`.slice(0, 155)
    : `View this project by ${provider.name} on Karyantrix.`;

  return {
    title,
    description,
    alternates: { canonical: `/providers/${params.id}/portfolio/${params.portfolioId}` },
    openGraph: {
      title: `${title} | Karyantrix`,
      description,
      url: `/providers/${params.id}/portfolio/${params.portfolioId}`,
      images: item.image_url ? [item.image_url] : undefined,
    },
    robots: { index: false, follow: true },
  };
}

export default async function PortfolioDetailPage({ params }) {
  const provider = await getProvider(params.id);
  const item = findPortfolioItem(provider, params.portfolioId);

  const breadcrumbJsonLd = provider
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Providers', item: `${siteUrl}/providers` },
          {
            '@type': 'ListItem',
            position: 3,
            name: provider.name,
            item: `${siteUrl}/providers/${params.id}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: item?.title || 'Portfolio work',
            item: `${siteUrl}/providers/${params.id}/portfolio/${params.portfolioId}`,
          },
        ],
      }
    : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <PortfolioDetailClient
        providerId={params.id}
        portfolioId={params.portfolioId}
        initialProvider={provider}
        initialItem={item}
      />
    </>
  );
}
