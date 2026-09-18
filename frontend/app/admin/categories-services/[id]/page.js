'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Pencil, Plus, Power, Trash2, UserX, X } from 'lucide-react';
import api from '../../../../lib/api';
import BackButton from '../../../../components/BackButton';
import { useToast } from '../../../../components/ui/Toast';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { Field, TextInput } from '../../../../components/ui/Field';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { getCategoryIcon } from '../../../../lib/categoryIcon';
import { getServiceIcon } from '../../../../lib/serviceIcon';
import useRefetchOnFocus from '../../../../lib/useRefetchOnFocus';

const EMPTY_FORM = { name: '', description: '' };

function ServiceFormModal({ open, onClose, categoryId, onSaved, service }) {
  const { toast } = useToast();
  const isEdit = Boolean(service);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(service ? { name: service.name || '', description: service.description || '' } : EMPTY_FORM);
  }, [open, service]);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Service name is required', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/service-catalog/${service.id}`, form);
        toast('Service updated', { type: 'success' });
      } else {
        await api.post('/admin/service-catalog', { category_id: categoryId, ...form });
        toast('Service added to catalog', { type: 'success' });
      }
      handleClose();
      onSaved();
    } catch (err) {
      toast(err.response?.data?.message || `Could not ${isEdit ? 'update' : 'create'} service`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-modal border border-ink-100"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink-900">{isEdit ? 'Edit Service' : 'Create New Service'}</h2>
            <button type="button" onClick={handleClose} aria-label="Close" className="rounded-xl p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Service name" hint='e.g. "Electrician", "Plumber", "AC Repair"'>
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service name" />
            </Field>
            <Field label="Description" hint="Shown to customers and providers when discovering this service">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief summary of service scope" />
            </Field>
            <div className="pt-2">
              <Button type="submit" loading={saving} fullWidth>
                {isEdit ? 'Save changes' : 'Create Service'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DeactivateModal({ service, onClose, onConfirm, deleting }) {
  if (!service) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-xs"
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 mb-4">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900">Deactivate {service.name}?</h3>
          <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
            This service will no longer appear for new providers or customer bookings in this category.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button variant="secondary" fullWidth onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth loading={deleting} onClick={onConfirm}>
              Deactivate
            </Button>
          </div>
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-xs"
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
              ? 'This will re-activate every catalog service in this category that was automatically turned off when the category was deactivated (services deactivated separately stay off), plus every provider listing that was turned off with them.'
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

function AdminCategoryServicesContent() {
  const { id } = useParams();
  const { toast } = useToast();
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [serviceToDeactivate, setServiceToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [activatingServiceId, setActivatingServiceId] = useState(null);
  const [categoryToggling, setCategoryToggling] = useState(false);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Use the admin catalog listing (not the public /service-catalog one)
      // so services that were auto-deactivated along with the category still
      // show up here for review.
      const [{ data: catData }, { data: svcData }] = await Promise.all([
        api.get(`/categories/id/${id}`),
        api.get('/admin/service-catalog', { params: { category_id: id } }),
      ]);
      setCategory(catData.category);
      setServices(svcData.services || []);
    } catch (err) {
      setCategory(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useRefetchOnFocus(load);

  const confirmDeactivate = async () => {
    if (!serviceToDeactivate) return;
    setDeactivating(true);
    try {
      await api.delete(`/admin/service-catalog/${serviceToDeactivate.id}`);
      toast('Service deactivated', { type: 'info' });
      setServiceToDeactivate(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not deactivate service', { type: 'error' });
    } finally {
      setDeactivating(false);
    }
  };

  const activateService = async (service) => {
    setActivatingServiceId(service.id);
    try {
      await api.put(`/admin/service-catalog/${service.id}`, { is_active: true });
      toast('Service activated', { type: 'success' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not activate service', { type: 'error' });
    } finally {
      setActivatingServiceId(null);
    }
  };

  const confirmCategoryToggle = async () => {
    if (!category) return;
    setCategoryToggling(true);
    const activating = !category.is_active;
    try {
      await api.put(`/admin/categories/${category.id}`, { is_active: activating });
      toast(activating ? 'Category activated' : 'Category deactivated', { type: activating ? 'success' : 'info' });
      setToggleModalOpen(false);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update category', { type: 'error' });
    } finally {
      setCategoryToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton href="/admin/categories-services" label="Back to Categories" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <BackButton href="/admin/categories-services" label="Back to Categories" />
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <UserX size={30} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-700">Category not found</p>
          <p className="text-xs text-ink-400">The requested category does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon(category.icon);

  return (
    <div className="space-y-6">
      <BackButton href="/admin/categories-services" label="Back to Categories" />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-200/80 bg-white p-5 sm:p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/80 text-brand-600 shadow-xs ring-1 ring-inset ring-brand-200/70">
            <CategoryIcon size={26} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{category.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  category.is_active
                    ? 'bg-trust-50 text-trust-700 border-trust-200/60'
                    : 'bg-rose-50 text-rose-600 border-rose-200/60'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${category.is_active ? 'bg-trust-500' : 'bg-rose-500'}`} />
                {category.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200/60">
                {services.length} service{services.length !== 1 ? 's' : ''}
              </span>
            </div>
            {category.description && (
              <p className="mt-1 max-w-2xl text-xs sm:text-sm text-ink-500 leading-relaxed">{category.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={category.is_active ? 'danger' : 'secondary'}
            onClick={() => setToggleModalOpen(true)}
            icon={<Power size={16} aria-hidden="true" />}
            className="shadow-xs"
          >
            {category.is_active ? 'Deactivate category' : 'Activate category'}
          </Button>
          <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} aria-hidden="true" />} className="shadow-xs">
            New Service
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-2">
            <Plus size={24} aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-ink-800">No services yet in this category</p>
          <p className="max-w-xs text-xs text-ink-400">Add standard catalog services for providers to list on their profiles.</p>
          <div className="mt-3">
            <Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus size={14} aria-hidden="true" />}>
              Add First Service
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, idx) => {
            const ServiceIcon = getServiceIcon(s.name, category.icon);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card
                  className={`group relative flex h-full flex-col justify-between p-5 border border-ink-200/80 shadow-soft hover:shadow-card-hover hover:border-brand-300 transition-all rounded-3xl ${
                    s.is_active ? '' : 'opacity-70'
                  }`}
                  hover={false}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 via-brand-100/60 to-accent-50/50 text-brand-600 ring-1 ring-inset ring-brand-200/60 transition-transform duration-200 group-hover:scale-105 shadow-xs">
                        <ServiceIcon size={20} strokeWidth={2} aria-hidden="true" />
                      </div>
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-trust-50 px-2.5 py-1 text-[11px] font-semibold text-trust-700 border border-trust-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-trust-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 border border-rose-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          {s.deactivated_by_category ? 'Off (category inactive)' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="font-display text-base font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
                        {s.name}
                      </h3>
                      {s.description ? (
                        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-500">
                          {s.description}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs italic text-ink-400">
                          No service description specified.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-ink-100/80 pt-3.5">
                    <button
                      type="button"
                      onClick={() => setServiceToEdit(s)}
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-700 transition-colors"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil size={13} aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    {s.is_active ? (
                      <button
                        type="button"
                        onClick={() => setServiceToDeactivate(s)}
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        aria-label={`Deactivate ${s.name}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span>Deactivate</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activateService(s)}
                        disabled={!category.is_active || activatingServiceId === s.id}
                        title={!category.is_active ? 'Activate the category first' : undefined}
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-trust-600 hover:bg-trust-50 hover:text-trust-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                        aria-label={`Activate ${s.name}`}
                      >
                        <CheckCircle2 size={13} aria-hidden="true" />
                        <span>{activatingServiceId === s.id ? 'Activating...' : 'Activate'}</span>
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ServiceFormModal open={createOpen} onClose={() => setCreateOpen(false)} categoryId={id} onSaved={load} />
      <ServiceFormModal
        open={Boolean(serviceToEdit)}
        service={serviceToEdit}
        onClose={() => setServiceToEdit(null)}
        onSaved={load}
      />
      <DeactivateModal
        service={serviceToDeactivate}
        onClose={() => setServiceToDeactivate(null)}
        onConfirm={confirmDeactivate}
        deleting={deactivating}
      />
      <ToggleCategoryModal
        category={toggleModalOpen ? category : null}
        onClose={() => setToggleModalOpen(false)}
        onConfirm={confirmCategoryToggle}
        saving={categoryToggling}
      />
    </div>
  );
}

export default function AdminCategoryServicesPage() {
  return <AdminCategoryServicesContent />;
}