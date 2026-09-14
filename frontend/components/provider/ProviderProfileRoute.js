'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { RowSkeleton } from '../ui/Skeleton';
import MyProviderProfileView from './MyProviderProfileView';
import useRefetchOnFocus from '../../lib/useRefetchOnFocus';

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
        <Icon className="h-6 w-6 text-ink-400" />
      </div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="max-w-xs text-sm text-ink-500">{description}</p>
    </div>
  );
}

export default function ProviderProfileRoute() {
  const router = useRouter();
  const { user, notifications } = useAuth();
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [{ data: profileData }, { data: serviceData }] = await Promise.all([
        api.get('/providers/me'),
        api.get('/services/my/listings'),
      ]);
      setProfile(profileData.profile || null);
      setServices(serviceData.services || []);

      if (user?.id) {
        try {
          const { data: reviewData } = await api.get(`/reviews/provider/${user.id}`);
          setReviews(reviewData.reviews || []);
        } catch {
          setReviews([]);
        }
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      loadAll();
    }
  }, [notifications]);

  useRefetchOnFocus(loadAll);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={Users}
        title="Aap abhi provider nahi hain"
        description="Provider ke roop me register karein taaki apna profile dekh/edit kar sakein."
      />
    );
  }

  return (
    <MyProviderProfileView
      profile={profile}
      services={services}
      reviews={reviews}
      onEdit={() => router.push('/provider/profile/edit')}
      onProfileUpdated={setProfile}
    />
  );
}
