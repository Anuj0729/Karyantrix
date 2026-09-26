import JsonLd from '../../components/JsonLd';
import HowItWorksClient from './HowItWorksClient';

const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'How It Works',
  description:
    'See exactly how Karyantrix works for customers and service providers - from posting a requirement or applying as a provider, to getting the job done and paid safely.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How It Works | Karyantrix',
    description:
      'A simple, step-by-step look at how customers hire verified professionals and how providers win work on Karyantrix.',
    url: '/how-it-works',
    images: [{ url: '/logo.png', width: 1024, height: 1024, alt: 'Karyantrix' }],
  },
};

export default function HowItWorksPage() {
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How Karyantrix works',
    description: 'Steps for customers to hire a verified professional and for providers to win work on Karyantrix.',
    image: `${siteUrl}/logo.png`,
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Post your requirement', text: 'Tell Karyantrix what you need, your budget, timing and address.' },
      { '@type': 'HowToStep', position: 2, name: 'Compare verified bids', text: 'Review quotes, ratings and profiles from verified providers.' },
      { '@type': 'HowToStep', position: 3, name: 'Chat and confirm', text: 'Message your chosen provider and lock in the details.' },
      { '@type': 'HowToStep', position: 4, name: 'Track the job', text: 'Follow progress in real time from start to finish.' },
      { '@type': 'HowToStep', position: 5, name: 'Pay and review', text: 'Release escrow payment once satisfied and leave a review.' },
    ],
  };

  return (
    <>
      <JsonLd data={howToJsonLd} />
      <HowItWorksClient />
    </>
  );
}
