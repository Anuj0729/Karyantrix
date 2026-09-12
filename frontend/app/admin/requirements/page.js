'use client';

import { useEffect, useState } from 'react';
import { Gavel } from 'lucide-react';
import api from '../../../lib/api';
import AdminRequirementCard from '../../../components/admin/AdminRequirementCard';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

function AdminRequirementsContent() {
  const [requirements, setRequirements] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRequirements = () => {
    setLoading(true);
    api
      .get('/admin/requirements', { params: status ? { status } : {} })
      .then(({ data }) => setRequirements(data.requirements || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequirements();
  }, [status]);

  useRefetchOnFocus(loadRequirements);

  const filtered = requirements.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const services = (r.services || []).join(' ').toLowerCase();
    const customer = r.customer?.name?.toLowerCase() || '';
    const desc = r.description?.toLowerCase() || '';
    return services.includes(term) || customer.includes(term) || desc.includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Marketplace Requirements</h2>
          <p className="text-xs text-ink-500">Monitor posted requests, client bids, and completed hires</p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requirements or customer..."
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
            {f.label} Requests
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && filtered.map((r) => <AdminRequirementCard key={r.id} requirement={r} />)}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
          <Gavel size={34} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-700">No requirements found</p>
          <p className="text-xs text-ink-400">Try changing your search terms or status filter.</p>
        </div>
      )}
    </div>
  );
}

export default function AdminRequirementsPage() {
  return <AdminRequirementsContent />;
}
