import LoginClient from './LoginClient';

export const metadata = {
  title: 'Log in',
  description: 'Log in to your Karyantrix account to book verified service providers, track bookings and chat with providers.',
  alternates: { canonical: '/login' },
  openGraph: {
    title: 'Log in | Karyantrix',
    description: 'Log in to your Karyantrix account to book verified service providers, track bookings and chat with providers.',
    url: '/login',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
