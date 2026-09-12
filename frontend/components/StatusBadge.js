import Badge from './ui/Badge';

const APPLICATION = {
  draft: { tone: 'neutral', label: 'Draft' },
  incomplete: { tone: 'warning', label: 'Incomplete' },
  submitted: { tone: 'brand', label: 'Submitted' },
  under_review: { tone: 'brand', label: 'Under review' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  changes_required: { tone: 'warning', label: 'Changes required' },
};

const REQUIREMENT = {
  open: { tone: 'success', label: 'Open' },
  closed: { tone: 'neutral', label: 'Closed' },
};

const BID = {
  pending: { tone: 'warning', label: 'Pending' },
  accepted: { tone: 'success', label: 'Accepted' },
  rejected: { tone: 'danger', label: 'Not selected' },
};

const REPORT = {
  pending: { tone: 'warning', label: 'Pending' },
  under_review: { tone: 'brand', label: 'Under review' },
  action_taken: { tone: 'success', label: 'Action taken' },
  dismissed: { tone: 'neutral', label: 'Dismissed' },
};

const BOOKING = {
  awaiting_advance: { tone: 'warning', label: 'Advance due' },
  in_progress: { tone: 'brand', label: 'Work in progress' },
  work_completed: { tone: 'warning', label: 'Balance due' },
  completed: { tone: 'success', label: 'Fully paid' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
};

const TICKET = {
  open: { tone: 'warning', label: 'Open' },
  in_progress: { tone: 'brand', label: 'In progress' },
  resolved: { tone: 'success', label: 'Resolved' },
  closed: { tone: 'neutral', label: 'Closed' },
};

const MAPS = { application: APPLICATION, requirement: REQUIREMENT, bid: BID, report: REPORT, booking: BOOKING, ticket: TICKET };

export default function StatusBadge({ status, kind = 'requirement', className = '' }) {
  const entry = MAPS[kind]?.[status] || { tone: 'neutral', label: status };
  return (
    <Badge tone={entry.tone} className={className}>
      {entry.label}
    </Badge>
  );
}
