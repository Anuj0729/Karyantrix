'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

// Shared "switch back to my provider account" action for the navbar, profile page, etc.
export default function useSwitchToProvider() {
  const { switchToProvider } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const run = useCallback(async () => {
    if (switching) return false;
    setSwitching(true);
    try {
      await switchToProvider();
      toast('You are back on your provider account', { type: 'success' });
      router.push('/provider/dashboard');
      return true;
    } catch (err) {
      toast(err.response?.data?.message || 'Could not switch to your provider account, please try again', {
        type: 'error',
      });
      return false;
    } finally {
      setSwitching(false);
    }
  }, [switching, switchToProvider, toast, router]);

  return { switching, switchToProvider: run };
}
