import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Footer from '../components/Footer';
import InstallPwaButton from '../components/InstallPwaButton';
import JsonLd from '../components/JsonLd';
import Navbar from '../components/Navbar';
import PwaRegister from '../components/PwaRegister';
import SplashScreen from '../components/SplashScreen';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { NavigationLoadingProvider } from '../context/NavigationLoadingContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Karyantrix - Kaam Aapka, Zimmedari Hamari',
    template: '%s | Karyantrix',
  },
  description:
    'Karyantrix is a trusted service marketplace connecting customers with verified, background-checked local service providers - home repairs, cleaning, tutoring, events and more.',
  keywords: [
    'Karyantrix',
    'service marketplace',
    'find service providers',
    'verified providers',
    'home services',
    'book a service online',
  ],
  authors: [{ name: 'Karyantrix' }],
  applicationName: 'Karyantrix',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Karyantrix',
  },
  openGraph: {
    type: 'website',
    siteName: 'Karyantrix',
    title: 'Karyantrix - Kaam Aapka, Zimmedari Hamari',
    description:
      'A trusted service marketplace connecting customers with verified providers.',
    url: siteUrl,
    images: [{ url: '/logo.png', width: 1024, height: 1024, alt: 'Karyantrix' }],
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
    title: 'Karyantrix - Kaam Aapka, Zimmedari Hamari',
    description:
      'A trusted service marketplace connecting customers with verified providers.',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#185FA5',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Karyantrix',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    'Karyantrix is a trusted service marketplace connecting customers with verified, background-checked local service providers.',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Karyantrix',
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/providers?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="flex min-h-screen flex-col">
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <PwaRegister />
        <ToastProvider>
          <AuthProvider>
            <ChatProvider>
              <NavigationLoadingProvider>
                <SplashScreen />
                <Navbar />
                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
                <Footer />
                <InstallPwaButton />
              </NavigationLoadingProvider>
            </ChatProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
