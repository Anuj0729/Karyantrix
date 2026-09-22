import JsonLd from '../../../components/JsonLd';
import RequirementDetailClient from './RequirementDetailClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

async function getRequirement(id) {
  try {
    const res = await fetch(`${apiUrl}/requirements/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.requirement || null;
  } catch {
    return null;
  }
}

const requirementTitle = (requirement) => (requirement.services || []).join(', ') || 'Service requirement';

export async function generateMetadata({ params }) {
  const requirement = await getRequirement(params.id);
  if (!requirement) {
    return {
      title: 'Requirement',
      description: 'Browse open service requirements from customers on Karyantrix.',
      alternates: { canonical: `/requirements/${params.id}` },
    };
  }

  const title = requirementTitle(requirement);
  const locationText = requirement.location?.text;
  const description = requirement.description
    ? `${requirement.description}`.slice(0, 155)
    : `${title}${locationText ? ` in ${locationText}` : ''} - browse this open requirement on Karyantrix.`;

  return {
    title,
    description,
    alternates: { canonical: `/requirements/${params.id}` },
    openGraph: { title: `${title} | Karyantrix`, description, url: `/requirements/${params.id}` },
    // Closed/hired requirements are no longer actionable - keep them out of search results
    // without blocking the (still relevant) open ones.
    robots: requirement.status === 'open' ? undefined : { index: false, follow: true },
  };
}

export default async function RequirementDetailPage({ params }) {
  const requirement = await getRequirement(params.id);

  const breadcrumbJsonLd = requirement
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Requirements', item: `${siteUrl}/requirements` },
          {
            '@type': 'ListItem',
            position: 3,
            name: requirementTitle(requirement),
            item: `${siteUrl}/requirements/${params.id}`,
          },
        ],
      }
    : null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <RequirementDetailClient initialRequirement={requirement} />
    </>
  );
}
