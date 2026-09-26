import JsonLd from '../../components/JsonLd';
import HelpClient from './HelpClient';
import { FAQS } from './helpData';

export const metadata = {
  title: 'Help Center',
  description:
    'Answers to common questions about posting requirements, bids, bookings, payments, escrow and becoming a verified provider on Karyantrix.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help Center | Karyantrix',
    description: 'Find quick answers or raise a support ticket - everything you need to get help on Karyantrix.',
    url: '/help',
  },
};

export default function HelpPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <HelpClient />
    </>
  );
}
