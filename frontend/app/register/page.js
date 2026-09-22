import RegisterClient from './RegisterClient';

export const metadata = {
  title: 'Create an account',
  description: 'Sign up for Karyantrix to book verified, background-checked local service providers or start offering your services.',
  alternates: { canonical: '/register' },
  openGraph: {
    title: 'Create an account | Karyantrix',
    description: 'Sign up for Karyantrix to book verified, background-checked local service providers or start offering your services.',
    url: '/register',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
