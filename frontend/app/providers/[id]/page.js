import JsonLd from '../../../components/JsonLd';
import ProviderDetailClient from './ProviderDetailClient';

const apiUrl = process.env.NEXT_API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.NEXT_SITE_URL || 'http://localhost:3000';

async function getProviderAndReviews(id) {
  try {
    const provRes = await fetch(`${apiUrl}/providers/${id}`, { next: { revalidate: 300 } });
    if (!provRes.ok) return { provider: null, reviews: [] };
    const data = await provRes.json();
    const provider = data.provider || data;
    if (!(provider?.user?.name || provider?.name)) return { provider: null, reviews: [] };

    const revRes = await fetch(`${apiUrl}/reviews/provider/${id}`, { next: { revalidate: 300 } });
    const reviews = revRes.ok ? (await revRes.json())?.reviews || [] : [];

    return { provider, reviews };
  } catch {
    return { provider: null, reviews: [] };
  }
}

export async function generateMetadata({ params }) {
  const { provider: profile } = await getProviderAndReviews(params.id);
  const name = profile?.user?.name || profile?.name;
  if (!name) {
    return {
      title: 'Provider profile',
      description: "View this provider's verified profile, services and reviews on Karyantrix.",
      alternates: { canonical: `/providers/${params.id}` },
    };
  }

  const headline = profile.headline || profile.bio;
  const title = `${name} - service provider`;
  const description = headline
    ? `${headline}`.slice(0, 155)
    : `View ${name}'s verified profile, services and reviews on Karyantrix.`;

  return {
    title,
    description,
    alternates: { canonical: `/providers/${params.id}` },
    openGraph: { title: `${title} | Karyantrix`, description, url: `/providers/${params.id}` },
  };
}

export default async function ProviderProfilePage({ params }) {
  const { provider, reviews } = await getProviderAndReviews(params.id);
  const name = provider?.name || provider?.user?.name;
  const p = provider?.providerProfile || {};

  const personJsonLd = provider
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        url: `${siteUrl}/providers/${params.id}`,
        image: provider.avatar_url || undefined,
        jobTitle: p.headline || undefined,
        description: p.bio || undefined,
        aggregateRating: p.total_reviews
          ? {
              '@type': 'AggregateRating',
              ratingValue: p.avg_rating || 0,
              reviewCount: p.total_reviews,
            }
          : undefined,
      }
    : null;

  return (
    <>
      <JsonLd data={personJsonLd} />
      <ProviderDetailClient initialProvider={provider} initialReviews={reviews} />
    </>
  );
}
