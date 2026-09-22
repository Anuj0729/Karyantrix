import BecomeProviderClient from './BecomeProviderClient';

export const metadata = {
  title: 'Become a service provider',
  description: 'Join Karyantrix as a verified service provider. Reach local customers, manage bookings and grow your business - apply in minutes.',
  alternates: { canonical: '/become-provider' },
  openGraph: {
    title: 'Become a service provider | Karyantrix',
    description: 'Join Karyantrix as a verified service provider. Reach local customers, manage bookings and grow your business - apply in minutes.',
    url: '/become-provider',
  },
};

export default function BecomeProviderPage() {
  return <BecomeProviderClient />;
}
