import { Suspense } from 'react';
import HomeClient from './HomeClient';

const apiUrl = process.env.API_URL || 'http://localhost:5000/api';

export const metadata = {
  alternates: { canonical: '/' },
};

async function safeGet(path) {
  try {
    const res = await fetch(`${apiUrl}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const statsData = await safeGet('/stats');

  return (
    <Suspense fallback={null}>
      <HomeClient
        initialStats={statsData?.stats || null}
        initialCategoryNames={statsData?.categoryNames || []}
      />
    </Suspense>
  );
}