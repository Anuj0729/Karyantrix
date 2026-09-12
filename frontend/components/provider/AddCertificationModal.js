'use client';

import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

const EMPTY = { title: '', issuer: '', year: '' };

export default function AddCertificationModal({ isOpen, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, year: form.year ? Number(form.year) : undefined });
    setForm(EMPTY);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full">
        <div className="flex items-start gap-2.5 px-5 pt-5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-50">
            <GraduationCap className="h-4 w-4 text-brand-600" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-900">Add Certification</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Highlight your credentials to build trust with customers.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Certification title *
            </label>
            <input
              type="text"
              required
              className={`${inputClass} mt-1.5`}
              placeholder="e.g. Licensed Electrician"
              value={form.title}
              onChange={handleChange('title')}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Issued by
            </label>
            <input
              type="text"
              className={`${inputClass} mt-1.5`}
              placeholder="e.g. ITI Lucknow"
              value={form.issuer}
              onChange={handleChange('issuer')}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Year
            </label>
            <input
              type="number"
              min="1950"
              max={new Date().getFullYear()}
              className={`${inputClass} mt-1.5`}
              placeholder="e.g. 2019"
              value={form.year}
              onChange={handleChange('year')}
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 border-t border-ink-100 px-5 py-4">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} type="button">
            Save Certification
          </Button>
        </div>
      </div>
    </Modal>
  );
}
