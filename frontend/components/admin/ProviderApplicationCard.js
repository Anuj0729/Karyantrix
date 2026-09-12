'use client';

import { MapPin, Briefcase, ShieldCheck, ShieldAlert, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import StatusBadge from '../StatusBadge';

const KYC_KEYS = ['aadhar_front', 'aadhar_back', 'passbook_front'];

export default function ProviderApplicationCard({ application, onOpen }) {
  const user = application.user || {};
  const kyc = application.kyc_documents || {};
  const docsUploaded = KYC_KEYS.filter((k) => kyc[k]).length;

  return (
    <Card interactive onClick={onOpen} className="cursor-pointer p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">{user.name || 'Unnamed applicant'}</p>
            <p className="text-xs text-ink-500">{application.professional_title || 'No title set'}</p>
          </div>
        </div>
        <StatusBadge status={application.application_status} kind="application" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
        {(application.location?.text || application.city) && (
          <span className="flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" /> {application.location?.text || application.city}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Briefcase size={12} aria-hidden="true" /> {application.service_count || 0} service{application.service_count === 1 ? '' : 's'}
        </span>
        <span className={`flex items-center gap-1 font-medium ${docsUploaded === 3 ? 'text-trust-600' : 'text-amber-600'}`}>
          {docsUploaded === 3 ? <ShieldCheck size={12} aria-hidden="true" /> : <ShieldAlert size={12} aria-hidden="true" />}
          {docsUploaded}/3 documents
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end text-xs font-semibold text-brand-600">
        View full application <ChevronRight size={14} aria-hidden="true" />
      </div>
    </Card>
  );
}
