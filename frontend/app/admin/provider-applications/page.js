'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import ProviderApplicationCard from '../../../components/admin/ProviderApplicationCard';
import ProviderApplicationModal from '../../../components/admin/ProviderApplicationModal';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const FILTERS = [
  { key: 'pending_review', label: 'Pending review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'changes_required', label: 'Changes required' },
  { key: 'all', label: 'All' },
];

function AdminProviderApplicationsContent() {
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('pending_review');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/applications', { params: { status } })
      .then(({ data }) => setApplications(data.applications || []))
      .catch(() => toast('Could not load applications', { type: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status]);

  useRefetchOnFocus(load);

  const filtered = applications.filter((a) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = a.user?.name?.toLowerCase() || '';
    const email = a.user?.email?.toLowerCase() || '';
    const title = a.professional_title?.toLowerCase() || '';
    return name.includes(term) || email.includes(term) || title.includes(term);
  });

  const handleReview = async (userId, action, feedback) => {
    setSubmitting(action);
    try {
      await api.patch(`/admin/applications/${userId}/review`, { action, feedback: feedback || undefined });
      const messages = {
        approve: 'Provider approved — the applicant now has provider access',
        reject: 'Application rejected',
        changes_required: 'Feedback sent — applicant asked to make changes',
      };
      toast(messages[action] || 'Application updated', { type: 'success' });
      setSelected(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update this application', { type: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Provider Applications</h2>
          <p className="text-xs text-ink-500">
            Review KYC documents and approve customers applying to become service providers
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or title..."
            className="w-full rounded-xl border border-ink-200/80 bg-white px-4 py-2 text-xs text-ink-900 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all ${
              status === f.key
                ? 'bg-brand-600 text-white shadow-xs'
                : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading &&
          filtered.map((a) => (
            <ProviderApplicationCard key={a.id} application={a} onOpen={() => setSelected(a)} />
          ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
          <ShieldCheck size={34} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-700">No applications found</p>
          <p className="text-xs text-ink-400">Try a different filter or search term.</p>
        </div>
      )}

      <ProviderApplicationModal
        application={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onReview={handleReview}
        submitting={submitting}
      />
    </div>
  );
}

export default function AdminProviderApplicationsPage() {
  return <AdminProviderApplicationsContent />;
}
