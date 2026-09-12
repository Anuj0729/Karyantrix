'use client';

import { CheckCircle2, Clock, AlertCircle, XCircle, ShieldCheck, Sparkles, RefreshCw, CreditCard } from 'lucide-react';
import Badge from './Badge';

const STATUS_CONFIGS = {
  requested: { label: 'Requested', tone: 'warning', icon: Clock },
  accepted: { label: 'Accepted', tone: 'brand', icon: CheckCircle2 },
  assigned: { label: 'Assigned', tone: 'brand', icon: Sparkles },
  in_progress: { label: 'In Progress', tone: 'accent', icon: RefreshCw },
  completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: XCircle },
  rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },

  payment_pending: { label: 'Payment Pending', tone: 'warning', icon: CreditCard },
  pending: { label: 'Pending', tone: 'warning', icon: Clock },
  partial: { label: 'Partial Paid', tone: 'accent', icon: CreditCard },
  paid: { label: 'Paid', tone: 'success', icon: CheckCircle2 },
  settled: { label: 'Settled', tone: 'success', icon: CheckCircle2 },
  released: { label: 'Released', tone: 'success', icon: CheckCircle2 },
  refunded: { label: 'Refunded', tone: 'purple', icon: RefreshCw },
  failed: { label: 'Failed', tone: 'danger', icon: AlertCircle },

  verified: { label: 'Verified', tone: 'success', icon: ShieldCheck },
  unverified: { label: 'Unverified', tone: 'neutral', icon: AlertCircle },
  approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
  active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  inactive: { label: 'Inactive', tone: 'neutral', icon: AlertCircle },

  open: { label: 'Open', tone: 'success', icon: Clock },
  closed: { label: 'Closed', tone: 'neutral', icon: CheckCircle2 },
  awarded: { label: 'Awarded', tone: 'brand', icon: Sparkles },
};

export default function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true,
  dot = true,
  className = '',
}) {
  const normalizedKey = String(status || '').toLowerCase().trim();
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: label || status?.replace(/_/g, ' ') || 'Unknown',
    tone: 'neutral',
    icon: AlertCircle,
  };

  const displayLabel = label || config.label;
  const IconComponent = config.icon;

  return (
    <Badge
      tone={config.tone}
      size={size}
      dot={dot}
      className={`capitalize font-medium tracking-wide ${className}`}
      icon={showIcon && IconComponent ? <IconComponent size={size === 'sm' ? 12 : 14} className="shrink-0" /> : null}
    >
      {displayLabel}
    </Badge>
  );
}
