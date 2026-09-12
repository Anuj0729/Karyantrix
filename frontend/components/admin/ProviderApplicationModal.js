'use client';

import { useState } from 'react';
import {
  X, Briefcase, Clock, Languages, Award, Image as ImageIcon,
  IdCard, ShieldCheck, CircleCheck, CircleX, TriangleAlert,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatusBadge from '../StatusBadge';
import { Field, TextArea } from '../ui/Field';
import { resolveMediaUrl } from '../chat/mediaUrl';
import { priceTypeShortLabel } from '../../lib/priceType';

const KYC_DOC_FIELDS = [
  { key: 'aadhar_front', label: 'Aadhaar card - front' },
  { key: 'aadhar_back', label: 'Aadhaar card - back' },
  { key: 'passbook_front', label: 'Bank passbook - front page' },
];

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
      {Icon && <Icon size={13} aria-hidden="true" />} {children}
    </p>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg bg-ink-50 p-3">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="text-sm font-medium text-ink-800">{value || '—'}</p>
    </div>
  );
}

function ImageLightbox({ src, label, onClose }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={label} className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl" />
        <p className="mt-3 text-center text-sm font-medium text-white/80">{label}</p>
      </div>
    </div>
  );
}

export default function ProviderApplicationModal({ application, isOpen, onClose, onReview, submitting }) {
  const [feedback, setFeedback] = useState('');
  const [lightbox, setLightbox] = useState(null);

  if (!application) return null;

  const profile = application;
  const user = profile.user || {};
  const kyc = profile.kyc_documents || {};
  const canDecide = ['submitted', 'under_review'].includes(profile.application_status);

  const handleClose = () => {
    setFeedback('');
    onClose();
  };

  const handleAction = (action) => {
    if (action !== 'approve' && !feedback.trim()) {
      return;
    }
    onReview(profile.user?.id || profile.user, action, feedback.trim());
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="3xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-600" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink-900">Provider Application</h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-base font-bold text-brand-700">
                {(user.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-ink-900">{user.name || 'Unnamed applicant'}</p>
                <p className="text-xs text-ink-500">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
              </div>
            </div>
            <StatusBadge status={profile.application_status} kind="application" />
          </div>

          {profile.application_feedback && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50 p-3 text-xs text-amber-800">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>{profile.application_feedback}</p>
            </div>
          )}

          <div>
            <SectionLabel icon={IdCard}>Professional profile</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoRow label="Title" value={profile.professional_title} />
              <InfoRow label="Location" value={profile.location?.text || profile.city} />
              <InfoRow label="Experience" value={profile.experience_years != null ? `${profile.experience_years} yrs` : null} />
              <InfoRow label="Service radius" value={profile.service_radius_km ? `${profile.service_radius_km} km` : null} />
              <InfoRow
                label="Starting price"
                value={profile.starting_price ? `₹${profile.starting_price} · ${priceTypeShortLabel(profile.starting_price_type)}` : null}
              />
              <InfoRow label="Services listed" value={profile.service_count} />
            </div>
            {profile.bio && (
              <div className="mt-3 rounded-lg bg-ink-50 p-3">
                <p className="text-[11px] text-ink-400">Bio</p>
                <p className="text-sm text-ink-700">{profile.bio}</p>
              </div>
            )}
          </div>

          <div>
            <SectionLabel icon={Briefcase}>Categories, skills & languages</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {(profile.categories || []).map((c) => (
                <Badge key={c.id || c} tone="brand">{c.name || c}</Badge>
              ))}
              {(profile.skills || []).map((s) => (
                <Badge key={s} tone="neutral">{s}</Badge>
              ))}
              {(profile.languages || []).map((l) => (
                <Badge key={l} tone="accent" icon={<Languages size={11} aria-hidden="true" />}>{l}</Badge>
              ))}
              {!profile.categories?.length && !profile.skills?.length && !profile.languages?.length && (
                <p className="text-xs text-ink-400">Nothing added yet</p>
              )}
            </div>
          </div>

          {profile.certifications?.length > 0 && (
            <div>
              <SectionLabel icon={Award}>Certifications</SectionLabel>
              <ul className="space-y-1.5">
                {profile.certifications.map((c, i) => (
                  <li key={i} className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-700">
                    <span className="font-semibold">{c.title}</span>
                    {c.issuer ? ` · ${c.issuer}` : ''}{c.year ? ` · ${c.year}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.portfolio?.length > 0 && (
            <div>
              <SectionLabel icon={ImageIcon}>Portfolio</SectionLabel>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {profile.portfolio.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox({ src: resolveMediaUrl(p.image_url), label: p.title || 'Portfolio item' })}
                    className="aspect-square overflow-hidden rounded-lg border border-ink-100"
                  >
                    <img src={resolveMediaUrl(p.image_url)} alt={p.title || ''} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {profile.availability && (
            <div>
              <SectionLabel icon={Clock}>Availability</SectionLabel>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <span className="rounded-full bg-ink-100 px-2.5 py-1 font-medium">
                  {(profile.availability.days || []).map((d) => d.toUpperCase()).join(', ') || 'No days set'}
                </span>
                <span className="rounded-full bg-ink-100 px-2.5 py-1 font-medium">
                  {profile.availability.hours_from} – {profile.availability.hours_to}
                </span>
              </div>
            </div>
          )}

          <div>
            <SectionLabel icon={ShieldCheck}>KYC documents</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {KYC_DOC_FIELDS.map((doc) => {
                const url = kyc[doc.key];
                return (
                  <div key={doc.key} className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-ink-600">{doc.label}</p>
                    {url ? (
                      <button
                        type="button"
                        onClick={() => setLightbox({ src: resolveMediaUrl(url), label: doc.label })}
                        className="block h-32 w-full overflow-hidden rounded-lg border border-ink-100"
                      >
                        <img src={resolveMediaUrl(url)} alt={doc.label} className="h-full w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 text-[11px] font-medium text-red-500">
                        Not uploaded
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {canDecide && (
            <div className="space-y-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <Field label="Feedback" hint="Required when rejecting or requesting changes; optional for approval.">
                <TextArea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Let the applicant know what to fix (if any)..."
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CircleCheck size={15} aria-hidden="true" />}
                  loading={submitting === 'approve'}
                  disabled={Boolean(submitting)}
                  onClick={() => handleAction('approve')}
                >
                  Approve provider
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<TriangleAlert size={15} aria-hidden="true" />}
                  loading={submitting === 'changes_required'}
                  disabled={Boolean(submitting) || !feedback.trim()}
                  onClick={() => handleAction('changes_required')}
                >
                  Request changes
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<CircleX size={15} aria-hidden="true" />}
                  loading={submitting === 'reject'}
                  disabled={Boolean(submitting) || !feedback.trim()}
                  onClick={() => handleAction('reject')}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {lightbox && <ImageLightbox src={lightbox.src} label={lightbox.label} onClose={() => setLightbox(null)} />}
    </>
  );
}
