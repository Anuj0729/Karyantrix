'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Briefcase, ChevronRight, PackageX, Sparkles, Star, Wrench } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { resolveMediaUrl } from '../../../components/chat/mediaUrl';

export default function ServiceDetailClient({ initialService = null }) {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [service, setService] = useState(initialService);
  const [loading, setLoading] = useState(!initialService);

  useEffect(() => {
    if (initialService) {
      setLoading(false);
      return;
    }
    api
      .get(`/services/${id}`)
      .then(({ data }) => setService(data.service))
      .catch(() => {
        setService(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <PackageX size={40} className="text-ink-300" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold text-ink-800">Service not found</h2>
        <p className="text-xs text-ink-500">The service you requested does not exist or has been removed.</p>
        <Link href="/categories">
          <Button variant="secondary" size="sm" className="mt-2">
            Browse Services
          </Button>
        </Link>
      </div>
    );
  }

  const profile = service.provider?.providerProfile;

  const handleBookService = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/services/${id}`)}`);
      return;
    }
    if (user.role !== 'customer') {
      toast('Only customer accounts can book a service', { type: 'info' });
      return;
    }
    router.push(`/?postRequirement=1${service.category?.id ? `&category=${service.category.id}` : ''}`);
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      <div className="overflow-hidden rounded-3xl border border-ink-200/80 bg-white shadow-card">
        {service.images?.length > 0 ? (
          <div className="relative h-64 w-full overflow-hidden bg-ink-100 sm:h-80">
            <Image
              src={service.images[0]}
              alt={service.title}
              fill
              sizes="(max-width: 640px) 100vw, 672px"
              className="object-cover"
              priority
            />
            <div className="absolute top-4 right-4 rounded-full bg-white/95 px-3.5 py-1.5 font-display text-base font-bold text-ink-900 shadow-md backdrop-blur-md">
              ₹{service.price}
              <span className="text-xs font-normal text-ink-500">
                {service.price_type === 'hourly' ? '/hr' : ' total'}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Wrench size={30} aria-hidden="true" />
            </div>
            <div className="absolute top-4 right-4 rounded-full bg-white/95 px-3.5 py-1.5 font-display text-base font-bold text-ink-900 shadow-md backdrop-blur-md">
              ₹{service.price}
              <span className="text-xs font-normal text-ink-500">
                {service.price_type === 'hourly' ? '/hr' : ' total'}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-50 border border-brand-200/70 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              {service.category?.name || 'Service'}
            </span>
          </div>

          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {service.title}
          </h1>

          {service.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {service.tags.map((t) => (
                <Badge key={t} tone="neutral" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-ink-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
              Service Description
            </h3>
            <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-line">
              {service.description}
            </p>
          </div>

          <div className="mt-6 border-t border-ink-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">
              Provided by
            </h3>
            <Link href={`/providers/${service.provider?.id}`}>
              <div className="group flex items-center gap-3.5 rounded-2xl border border-ink-200/80 bg-ink-50/50 p-4 transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/50">
                <img
                  src={resolveMediaUrl(service.provider?.avatar_url) || 'https://i.pravatar.cc/300?img=15'}
                  alt={service.provider?.name}
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-sm font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                      {service.provider?.name}
                    </p>
                    {profile?.is_approved && (
                      <BadgeCheck size={16} className="text-brand-600 shrink-0" aria-label="Verified" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
                    <span className="flex items-center gap-1 font-semibold text-ink-800">
                      <Star size={13} className="fill-gold-500 text-gold-500" aria-hidden="true" />
                      {profile?.avg_rating || 'New'} ({profile?.total_reviews || 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} aria-hidden="true" />
                      {profile?.experience_years || 0} yrs experience
                    </span>
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-ink-400 shadow-xs transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              </div>
            </Link>
          </div>

          {user?.role !== 'provider' && (
            <div className="mt-8 border-t border-ink-100 pt-6">
              <Button fullWidth size="lg" onClick={handleBookService}>
                {user ? 'Post a Requirement to Hire for This' : 'Book Service'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
