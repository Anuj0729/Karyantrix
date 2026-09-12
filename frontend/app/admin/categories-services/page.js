'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Plus, Power, X } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import { useToast } from '../../../components/ui/Toast';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Field, TextInput } from '../../../components/ui/Field';
import { getCategoryIcon, CATEGORY_ICON_SUGGESTIONS } from '../../../lib/categoryIcon';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const EMPTY_FORM = { name: '', slug: '', description: '', icon: '' };

function CreateCategoryModal({ open, onClose, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/categories', form);
      toast('Category created', { type: 'success' });
      handleClose();
      onCreated();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not create category', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Create category</h2>
            <button type="button" onClick={handleClose} aria-label="Close" className="rounded-lg p-1 text-ink-400 hover:bg-ink-100">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} />
            </Field>
            <Field label="Slug" hint="Auto-generated, editable">
              <TextInput required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </Field>
            <Field label="Description">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Icon" hint={`e.g. ${CATEGORY_ICON_SUGGESTIONS.slice(0, 4).join(', ')}`}>
              <TextInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="droplet" />
              {form.icon && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
                  Preview:
                  {(() => {
                    const Preview = getCategoryIcon(form.icon);
                    return <Preview size={16} className="text-brand-600" aria-hidden="true" />;
                  })()}
                </p>
              )}
            </Field>
            <Button type="submit" loading={saving} fullWidth>
              Create
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ToggleCategoryModal({ category, onClose, onConfirm, saving }) {
  if (!category) return null;
  const activating = !category.is_active;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-modal border border-ink-100 text-center"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border mb-4 ${
              activating ? 'bg-trust-50 text-trust-600 border-trust-100' : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}
          >
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900">
            {activating ? 'Activate' : 'Deactivate'} {category.name}?
          </h3>
          <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
            {activating
              ? 'This will re-activate every catalog service and provider listing that was automatically turned off when this category was deactivated.'
              : 'This will also deactivate every catalog service in this category, and every provider listing under it, until the category is activated again.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant={activating ? 'primary' : 'danger'} fullWidth loading={saving} onClick={onConfirm}>
              {activating ? 'Activate' : 'Deactivate'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CategoryTile({ category, serviceCount, onToggle }) {
  const Icon = getCategoryIcon(category.icon);
  return (
    <Card
      className={`flex h-full flex-col gap-3.5 p-5 border-ink-200/80 shadow-xs transition-all hover:border-brand-300 hover:shadow-card ${
        category.is_active ? '' : 'opacity-70'
      }`}
      hover={false}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors shadow-xs">
          <Icon size={22} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              category.is_active
                ? 'bg-trust-50 text-trust-700 border-trust-200/60'
                : 'bg-rose-50 text-rose-600 border-rose-200/60'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${category.is_active ? 'bg-trust-500' : 'bg-rose-500'}`} />
            {category.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className="rounded-full bg-ink-100/80 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
            {serviceCount} service{serviceCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <Link href={`/admin/categories-services/${category.id}`} className="flex-1 group">
        <p className="font-bold text-sm text-ink-900 group-hover:text-brand-600 transition-colors">{category.name}</p>
        {category.description && (
          <p className="mt-1 line-clamp-2 text-xs text-ink-500 leading-relaxed">{category.description}</p>
        )}
      </Link>
      <div className="flex items-center justify-between border-t border-ink-100/80 pt-3.5">
        <Link
          href={`/admin/categories-services/${category.id}`}
          className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
        >
          <span>Manage catalog</span>
          <span className="transition-transform">&rarr;</span>
        </Link>
        <button
          type="button"
          onClick={() => onToggle(category)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            category.is_active
              ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
              : 'text-trust-600 hover:bg-trust-50 hover:text-trust-700'
          }`}
          aria-label={`${category.is_active ? 'Deactivate' : 'Activate'} ${category.name}`}
        >
          <Power size={13} aria-hidden="true" />
          <span>{category.is_active ? 'Deactivate' : 'Activate'}</span>
        </button>
      </div>
    </Card>
  );
}

function AdminCategoriesServicesContent() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [serviceCounts, setServiceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryToToggle, setCategoryToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    setLoading(true);
    // Use the admin listing (not the public /categories one) so inactive
    // categories still show up here and can be re-activated.
    const [{ data: catData }, { data: svcData }] = await Promise.all([
      api.get('/admin/categories'),
      api.get('/admin/service-catalog'),
    ]);
    setCategories(catData.categories || []);
    const counts = {};
    (svcData.services || []).forEach((s) => {
      const catId = s.category?.id;
      if (catId) counts[catId] = (counts[catId] || 0) + 1;
    });
    setServiceCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRefetchOnFocus(load);

  const confirmToggle = async () => {
    if (!categoryToToggle) return;
    setToggling(true);
    const activating = !categoryToToggle.is_active;
    try {
      await api.put(`/admin/categories/${categoryToToggle.id}`, { is_active: activating });
      toast(activating ? 'Category activated' : 'Category deactivated', { type: activating ? 'success' : 'info' });
      setCategoryToToggle(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update category', { type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to Dashboard" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Categories & Service Catalog</h2>
          <p className="text-xs text-ink-500">Configure marketplace taxonomy, industry groupings, and bookable services</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} aria-hidden="true" />} className="shadow-xs">
          New Category
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-40 animate-pulse bg-ink-50/50 p-5" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
          <p className="text-sm font-semibold text-ink-700">No categories found</p>
          <p className="text-xs text-ink-400">Get started by creating your first service category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryTile key={c.id} category={c} serviceCount={serviceCounts[c.id] || 0} onToggle={setCategoryToToggle} />
          ))}
        </div>
      )}

      <CreateCategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
      <ToggleCategoryModal
        category={categoryToToggle}
        onClose={() => setCategoryToToggle(null)}
        onConfirm={confirmToggle}
        saving={toggling}
      />
    </div>
  );
}

export default function AdminCategoriesServicesPage() {
  return <AdminCategoriesServicesContent />;
}
