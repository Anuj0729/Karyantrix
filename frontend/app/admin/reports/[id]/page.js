'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Ban, Check, ShieldOff, UserX } from 'lucide-react';
import api from '../../../../lib/api';
import BackButton from '../../../../components/BackButton';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import StatusBadge from '../../../../components/StatusBadge';
import { TextArea } from '../../../../components/ui/Field';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useToast } from '../../../../components/ui/Toast';
import { REPORT_REASONS } from '../../../../components/ReportModal';
import { resolveMediaUrl } from '../../../../components/chat/mediaUrl';
import useRefetchOnFocus from '../../../../lib/useRefetchOnFocus';

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label || value;

function PersonCard({ title, person, extra }) {
  return (
    <Card className="p-5 border-ink-200/80 shadow-xs" hover={false}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">{title}</p>
      <div className="flex items-center gap-3.5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-brand-100 shadow-xs">
          <img
            src={resolveMediaUrl(person?.avatar_url) || 'https://i.pravatar.cc/300?img=8'}
            alt={person?.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">{person?.name || 'Unknown'}</p>
          <p className="truncate text-xs font-mono text-ink-500 mt-0.5">{person?.email || person?.phone || '—'}</p>
        </div>
      </div>
      {extra}
    </Card>
  );
}

function ReportDetailContent() {
  const { id } = useParams();
  const { toast } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [busyAction, setBusyAction] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/reports/${id}`)
      .then(({ data }) => setReport(data.report))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  useRefetchOnFocus(load);

  const resolved = report && ['action_taken', 'dismissed'].includes(report.status);

  const resolve = async (action) => {
    if (
      (action === 'suspend' || action === 'ban') &&
      !confirm(
        `${action === 'ban' ? 'Permanently ban' : 'Suspend'} ${report.reported_user?.name}'s account? They will be logged out immediately.`
      )
    ) {
      return;
    }
    setBusyAction(action);
    try {
      const { data } = await api.patch(`/admin/reports/${id}/resolve`, {
        action,
        admin_notes: notes.trim() || undefined,
      });
      setReport((prev) => ({ ...prev, ...data.report }));
      toast(data.message, { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update this report', { type: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <BackButton href="/admin/reports" label="Back to reports" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <BackButton href="/admin/reports" label="Back to reports" />
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-20 text-center">
          <UserX size={34} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-700">Report not found</p>
          <p className="text-xs text-ink-400">The requested dispute or report ID does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/admin/reports" label="Back to reports" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Incident Review #{id.slice(0, 8)}</h2>
          <p className="text-xs text-ink-500">Examine allegation details, user history, and adjudicate dispute</p>
        </div>
        <StatusBadge status={report.status} kind="report" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PersonCard
          title="Reporting Party"
          person={report.reporter}
          extra={
            <div className="mt-3">
              <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600 capitalize">
                Role: {report.reporter_role}
              </span>
            </div>
          }
        />
        <PersonCard
          title="Reported Account"
          person={report.reported_user}
          extra={
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600 capitalize">
                Role: {report.reported_role}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${
                  report.reported_user?.account_status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {report.reported_user?.account_status || 'active'}
              </span>
              {report.prior_reports_against_user > 0 && (
                <Badge tone="warning" icon={<AlertTriangle size={12} aria-hidden="true" />}>
                  {report.prior_reports_against_user} prior report{report.prior_reports_against_user !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          }
        />
      </div>

      <Card className="p-5 border-ink-200/80 shadow-xs" hover={false}>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Violation Reason</p>
          <Badge tone="brand">{reasonLabel(report.reason)}</Badge>
        </div>
        <div className="rounded-xl bg-ink-50/50 p-4 border border-ink-100/80 my-3">
          <p className="text-xs font-semibold text-ink-900 mb-1">Reporter Statement:</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-700">{report.description}</p>
        </div>
        <p className="text-[11px] text-ink-400">
          Report submitted on {new Date(report.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </Card>

      {resolved ? (
        <Card className="p-5 border-ink-200/80 shadow-xs bg-ink-50/30" hover={false}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Official Adjudication</p>
          <p className="text-xs font-semibold text-ink-800">
            {report.status === 'dismissed'
              ? 'Dismissed - no disciplinary action taken.'
              : `Action taken: ${report.action_taken?.replace(/_/g, ' ')}`}
          </p>
          {report.admin_notes && (
            <div className="mt-2.5 rounded-xl border border-ink-200/60 bg-white p-3 text-xs text-ink-700 italic">
              &ldquo;{report.admin_notes}&rdquo;
            </div>
          )}
          <p className="mt-3 text-[11px] text-ink-400">
            Adjudicated by {report.resolved_by?.name || 'Admin'} on {report.resolved_at ? new Date(report.resolved_at).toLocaleString() : '—'}
          </p>
        </Card>
      ) : (
        <Card className="p-5 border-ink-200/80 shadow-xs" hover={false}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">Adjudicate Dispute</p>
          <TextArea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Official resolution note (shared with reported user for warning/suspension/ban, or archived internally for dismissed reports)..."
            className="mb-4 text-xs"
          />
          <div className="flex flex-wrap gap-2.5 justify-end">
            <Button
              size="sm"
              variant="secondary"
              loading={busyAction === 'dismiss'}
              onClick={() => resolve('dismiss')}
              icon={<Check size={14} aria-hidden="true" />}
            >
              Dismiss Report
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={busyAction === 'warn'}
              onClick={() => resolve('warn')}
              icon={<AlertTriangle size={14} aria-hidden="true" />}
            >
              Issue Warning
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busyAction === 'suspend'}
              onClick={() => resolve('suspend')}
              icon={<ShieldOff size={14} aria-hidden="true" />}
            >
              Suspend Account
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busyAction === 'ban'}
              onClick={() => resolve('ban')}
              icon={<Ban size={14} aria-hidden="true" />}
            >
              Permanent Ban
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AdminReportDetailPage() {
  return <ReportDetailContent />;
}
