'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '../../../components/ui/Spinner';

export default function ProviderProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size={26} className="text-brand-600" />
    </div>
  );
}
