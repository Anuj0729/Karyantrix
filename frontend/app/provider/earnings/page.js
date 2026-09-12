'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, IndianRupee, PiggyBank, Wallet } from 'lucide-react';
import api from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { RowSkeleton, Skeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const fmtINR = (n) => `\u20b9${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014');

function StatCard({ label, value, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-[18px] border-ink-100 shadow-xs" hover={false}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.brand}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 font-medium leading-snug">{label}</p>
    </Card>
  );
}

function ProviderEarningsContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEarnings = () => {
    api
      .get('/bookings/wallet/my-earnings')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  useRefetchOnFocus(loadEarnings);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/provider/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-900">My Earnings & Payouts</h2>
        <p className="text-xs text-ink-500">Track what you&rsquo;ve been paid, what&rsquo;s pending, and when to expect it.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-ink-400">Could not load your earnings.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            <StatCard label="Pending payout" value={fmtINR(data.total_pending_payout)} icon={Clock3} tone="warning" />
            <StatCard label="Commission rate" value={`${data.commission_percent}%`} icon={IndianRupee} tone="brand" />
            <StatCard label="Payout promise" value={`${data.payout_sla_days} day${data.payout_sla_days === 1 ? '' : 's'}`} icon={PiggyBank} tone="success" />
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-ink-900">Awaiting payout</h3>
            {data.awaiting_payout.length === 0 ? (
              <Card className="p-6 border-ink-100 shadow-xs" hover={false}>
                <p className="text-xs text-ink-400 italic">Nothing pending &mdash; you&rsquo;re fully paid up.</p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {data.awaiting_payout.map((b) => (
                  <Card key={b.booking_id} className="p-4 border-ink-100 shadow-xs" hover={false}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-ink-800">Booking with {b.customer?.name}</p>
                        <p className="mt-0.5 text-[11px] text-ink-400">
                          Completed {fmtDate(b.work_completed_at)} &middot; total {fmtINR(b.total_amount)}
                          {b.already_paid > 0 && <> &middot; {fmtINR(b.already_paid)} already paid</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold font-mono text-sm text-amber-600">{fmtINR(b.pending_amount)}</p>
                          {b.expected_by && (
                            <p className="text-[11px] text-ink-400">Expected by {fmtDate(b.expected_by)}</p>
                          )}
                        </div>
                        <Badge tone="warning" size="sm" dot>Pending</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {data.upcoming_bookings.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-ink-900">In progress &mdash; not payable yet</h3>
              <p className="text-[11px] text-ink-400">These become payable once the customer has paid the full advance + balance.</p>
              <div className="space-y-2">
                {data.upcoming_bookings.map((b) => (
                  <div key={b.booking_id} className="flex items-center justify-between rounded-xl bg-ink-50/60 p-3 text-xs">
                    <span className="text-ink-600">
                      {b.customer?.name} &middot; total {fmtINR(b.total_amount)}
                    </span>
                    <span className="font-mono font-semibold text-ink-500">est. {fmtINR(b.estimated_payable)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-ink-900">Payout history</h3>
            {data.payout_history.length === 0 ? (
              <Card className="p-6 border-ink-100 shadow-xs" hover={false}>
                <p className="text-xs text-ink-400 italic">No payouts recorded yet.</p>
              </Card>
            ) : (
              <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-ink-100 text-ink-400">
                        <th className="py-2 font-semibold">Date</th>
                        <th className="py-2 font-semibold text-right">Amount</th>
                        <th className="py-2 font-semibold">Method</th>
                        <th className="py-2 font-semibold">Reference</th>
                        <th className="py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payout_history.map((p) => (
                        <tr key={p.id} className="border-b border-ink-50 last:border-0">
                          <td className="py-3 text-ink-500 whitespace-nowrap">{fmtDate(p.resolved_at || p.createdAt)}</td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600">{fmtINR(p.amount)}</td>
                          <td className="py-3 text-ink-600 capitalize">{p.method?.replace('_', ' ')}</td>
                          <td className="py-3 text-ink-500">{p.reference || '\u2014'}</td>
                          <td className="py-3">
                            <Badge
                              tone={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}
                              size="sm"
                              dot
                              icon={p.status === 'completed' ? <CheckCircle2 size={11} /> : undefined}
                            >
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function ProviderEarningsPage() {
  return (
    <ProtectedRoute allowedRoles={['provider']}>
      <ProviderEarningsContent />
    </ProtectedRoute>
  );
}
