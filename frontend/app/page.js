import { Suspense } from 'react';
import HomeClient from './HomeClient';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const metadata = {
  alternates: { canonical: '/' },
};

async function safeGet(path) {
  try {
    const res = await fetch(`${apiUrl}${path}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [categoriesData, providersData] = await Promise.all([
    safeGet('/categories'),
    safeGet('/providers?sort=rating&limit=3'),
  ]);

  return (
    <Suspense fallback={null}>
      <HomeClient
        initialCategories={categoriesData?.categories || []}
        initialProviders={providersData?.providers || []}
      />
    </Suspense>
  );
}
