'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Award,
  BadgeCheck,
  Briefcase,
  Calendar,
  CalendarPlus,
  Clock,
  Flag,
  MapPin,
  MessageCircle,
  Repeat,
  Send,
  Star,
  UserX,
  Wrench,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useChat } from '../../../context/ChatContext';
import { useToast } from '../../../components/ui/Toast';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import dynamic from 'next/dynamic';
import { resolveMediaUrl } from '../../../components/chat/mediaUrl';
import { priceTypeShortLabel } from '../../../lib/priceType';

const ReportModal = dynamic(() => import('../../../components/ReportModal'));
const RequirementComposerModal = dynamic(() => import('../../../components/RequirementComposerModal'));

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function Stat({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={18} />
        </div>
      )}
      <div>
        <p className="font-display text-lg font-bold text-ink-900 leading-tight">{value}</p>
        <p className="text-[11px] font-medium text-ink-500">{label}</p>
        {sublabel && <p className="text-[10px] font-medium text-ink-400">{sublabel}</p>}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <Skeleton className="h-24 w-24 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function ProviderDetailClient({ initialProvider = null, initialReviews = [] }) {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { openChatWithProvider } = useChat();
  const { toast } = useToast();

  const [provider, setProvider] = useState(initialProvider);
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(!initialProvider);
  const [tab, setTab] = useState('services');
  const [contacting, setContacting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    if (initialProvider) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/providers/${id}`),
      api.get(`/reviews/provider/${id}`).catch(() => ({ data: { reviews: [] } })),
    ])
      .then(([provRes, revRes]) => {
        setProvider(provRes.data.provider);
        setReviews(revRes.data.reviews || []);
      })
      .catch(() => {
        setProvider(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProfileSkeleton />;

  if (!provider) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <UserX size={38} className="text-ink-300" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold text-ink-800">Provider not found</h2>
        <p className="text-xs text-ink-500">The provider you are looking for may have updated their profile or is unavailable.</p>
        <Link href="/providers">
          <Button variant="secondary" size="sm" className="mt-2">
            Back to Providers
          </Button>
        </Link>
      </div>
    );
  }

  const p = provider.providerProfile || {};
  const services = provider.services || [];
  const memberSince = provider.createdAt ? new Date(provider.createdAt).getFullYear() : null;
  const responseRate = p.response_rate ?? null;

  const handleContact = async () => {
    if (!user) {
      router.push(`/login?next=/providers/${id}`);
      return;
    }
    if (user.role !== 'customer') {
      toast('Only customer accounts can start a chat from a provider profile', { type: 'info' });
      return;
    }
    setContacting(true);
    try {
      await openChatWithProvider(provider.id);
    } catch (err) {
      toast(err.response?.data?.message || 'Could not start the conversation, please try again', {
        type: 'error',
      });
    } finally {
      setContacting(false);
    }
  };

  const handleBookProvider = () => {
    if (!user) {
      router.push(`/login?next=/providers/${id}`);
      return;
    }
    if (user.role !== 'customer') {
      toast('Only customer accounts can book a provider', { type: 'info' });
      return;
    }
    setBookOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/80 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <img
                src={resolveMediaUrl(provider.avatar_url) || 'https://i.pravatar.cc/300?img=12'}
                alt={provider.name}
                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-ink-100 shadow-md sm:h-28 sm:w-28"
              />
              <span
                className={`absolute bottom-1 right-1 h-4.5 w-4.5 rounded-full ring-2 ring-white ${
                  p.is_online ? 'bg-trust-500' : 'bg-ink-300'
                }`}
                title={p.is_online ? 'Online now' : 'Offline'}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                  {provider.name}
                </h1>
                {p.verification_status === 'verified' && (
                  <Badge tone="success" icon={<BadgeCheck size={14} aria-hidden="true" />}>
                    Verified Professional
                  </Badge>
                )}
              </div>

              <p className="text-sm font-semibold text-brand-600">
                {p.professional_title || 'Expert Service Provider'}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-ink-500">
                <span className="flex items-center gap-1 font-semibold text-ink-900">
                  <Star size={14} className="fill-gold-500 text-gold-500" aria-hidden="true" />
                  {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : 'New'}
                  <span className="font-normal text-ink-400">({p.total_reviews || 0} reviews)</span>
                </span>

                {p.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-ink-400" aria-hidden="true" />
                    {p.city}
                  </span>
                )}

                {p.response_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-ink-400" aria-hidden="true" />
                    Responds in ~{p.response_time_minutes} min
                  </span>
                )}

                {memberSince && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-ink-400" aria-hidden="true" />
                    Member since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:w-48 sm:shrink-0">
            <Button
              fullWidth
              loading={contacting}
              onClick={handleContact}
              icon={<MessageCircle size={17} aria-hidden="true" />}
            >
              Contact Provider
            </Button>
            <Button
              fullWidth
              variant="accent"
              onClick={() =>
                document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              icon={<CalendarPlus size={17} aria-hidden="true" />}
            >
              View Services
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={handleBookProvider}
              icon={<Send size={17} aria-hidden="true" />}
            >
              Book This Provider
            </Button>
            {user?.role === 'customer' && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="mt-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-ink-400 hover:text-red-600 transition-colors"
              >
                <Flag size={12} aria-hidden="true" />
                Report profile
              </button>
            )}
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUser={{ id: provider.id, name: provider.name, role: 'provider' }}
      />

      <RequirementComposerModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        targetProvider={{ id: provider.id, name: provider.name }}
      />

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          icon={Briefcase}
          label="Jobs Completed"
          value={p.total_jobs_completed || 0}
        />
        <Stat
          icon={Star}
          label="Total Reviews"
          value={p.total_reviews || 0}
        />
        <Stat
          icon={Clock}
          label="Response Rate"
          value={responseRate ? `${responseRate}%` : '—'}
        />
        <Stat
          icon={Repeat}
          label="Repeat Clients"
          value={p.repeat_customers || 0}
        />
        <Stat
          label="Starting From"
          value={p.starting_price ? `₹${p.starting_price}` : 'On quote'}
          sublabel={p.starting_price ? priceTypeShortLabel(p.starting_price_type) : null}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5" hover={false}>
            <h3 className="font-display text-sm font-bold text-ink-900 mb-2.5">
              About the Professional
            </h3>
            <p className="text-xs leading-relaxed text-ink-600">
              {p.bio || 'No detailed biography provided yet.'}
            </p>

            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-3 text-xs">
              {p.experience_years > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-400">Total Experience</dt>
                  <dd className="font-semibold text-ink-800">{p.experience_years} years</dd>
                </div>
              )}
              {p.service_area && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-400">Service Coverage</dt>
                  <dd className="font-semibold text-ink-800">{p.service_area}</dd>
                </div>
              )}
              {p.service_radius_km && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-400">Travel Radius</dt>
                  <dd className="font-semibold text-ink-800">{p.service_radius_km} km</dd>
                </div>
              )}
            </dl>

            {p.languages?.length > 0 && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Languages Spoken
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {p.languages.map((l) => (
                    <Badge key={l} tone="neutral" size="sm">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {p.skills?.length > 0 && (
            <Card className="p-5" hover={false}>
              <h3 className="font-display text-sm font-bold text-ink-900 mb-2.5">
                Skills &amp; Specializations
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s) => (
                  <Badge key={s} tone="brand" size="sm">
                    {s}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {p.certifications?.length > 0 && (
            <Card className="p-5" hover={false}>
              <h3 className="font-display text-sm font-bold text-ink-900 mb-3">
                Verified Certifications
              </h3>
              <ul className="space-y-2.5 text-xs">
                {p.certifications.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Award size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-ink-900">{c.title}</p>
                      <p className="text-[11px] text-ink-500">
                        {c.issuer}
                        {c.year ? ` • ${c.year}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {p.availability?.days?.length > 0 && (
            <Card className="p-5" hover={false}>
              <h3 className="font-display text-sm font-bold text-ink-900 mb-3">
                Standard Working Schedule
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {ALL_DAYS.map((d) => (
                  <div
                    key={d}
                    className={`rounded-lg py-2 text-center text-[10px] font-bold ${
                      p.availability.days.includes(d)
                        ? 'bg-brand-50 text-brand-700 border border-brand-200/70'
                        : 'bg-ink-50 text-ink-300'
                    }`}
                  >
                    {DAY_LABELS[d]}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-ink-600 flex items-center gap-1.5">
                <Clock size={13} className="text-ink-400" />
                {p.availability.hours_from} &ndash; {p.availability.hours_to}
              </p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="flex border-b border-ink-200/80">
            {[
              { key: 'services', label: `Services (${services.length})` },
              { key: 'portfolio', label: `Portfolio (${p.portfolio?.length || 0})` },
              { key: 'reviews', label: `Reviews (${reviews.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  tab === t.key ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />
                )}
              </button>
            ))}
          </div>

          <div id="services-section" className="scroll-mt-24">
            {tab === 'services' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {services.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border border-dashed border-ink-200 p-8 text-center text-xs text-ink-400">
                    No individual catalog services listed yet. Contact the provider directly for custom quotes.
                  </div>
                ) : (
                  services.map((s) => (
                    <Card key={s.id} className="flex flex-col justify-between overflow-hidden p-0">
                      {s.images?.[0] ? (
                        <img src={s.images[0]} alt={s.title} className="h-40 w-full object-cover" />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center bg-brand-50/60 text-brand-400">
                          <Wrench size={32} />
                        </div>
                      )}
                      <div className="p-4 flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="font-display text-sm font-bold text-ink-900">{s.title}</h4>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">
                            {s.description}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                          <span className="font-display text-base font-bold text-ink-900">
                            ₹{s.price}
                            {s.price_type === 'hourly' ? '/hr' : ''}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {tab === 'portfolio' && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {(!p.portfolio || p.portfolio.length === 0) ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-ink-200 p-8 text-center text-xs text-ink-400">
                    No portfolio projects uploaded yet.
                  </div>
                ) : (
                  p.portfolio.map((item, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-2xl border border-ink-100 shadow-soft"
                    >
                      <img
                        src={resolveMediaUrl(item.image_url)}
                        alt={item.title}
                        className="h-36 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-44"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-xs font-semibold text-white">{item.title}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-xs text-ink-400">
                    No customer reviews yet. Be the first to book and rate this provider!
                  </div>
                ) : (
                  reviews.map((r) => (
                    <Card key={r.id} className="p-5" hover={false}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-inset ring-brand-200/60">
                            {r.customer?.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink-900">{r.customer?.name || 'Verified Client'}</p>
                            <p className="text-[11px] text-ink-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-gold-50 border border-gold-200/80 px-2.5 py-0.5 text-xs font-bold text-gold-700">
                          <Star size={13} className="fill-gold-500 text-gold-500" aria-hidden="true" />
                          {r.rating}
                        </span>
                      </div>
                      {r.title && (
                        <p className="mt-3 text-xs font-bold text-ink-900">{r.title}</p>
                      )}
                      <p className="mt-1 text-xs leading-relaxed text-ink-600">{r.comment}</p>

                      {r.provider_response?.text && (
                        <div className="mt-3.5 rounded-xl border border-ink-100 bg-ink-50/70 p-3.5">
                          <p className="text-[11px] font-bold text-ink-700">
                            Response from {provider.name}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-600">
                            {r.provider_response.text}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
