import RequirementsClient from './RequirementsClient';

export const metadata = {
  title: 'Requirements near you',
  description:
    'Browse live customer requirements near you on Karyantrix. Providers can bid on real jobs, customers can post what they need.',
  alternates: { canonical: '/requirements' },
};

export default function RequirementsPage() {
  return <RequirementsClient />;
}