'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Users, X } from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import usePagination from '../../../lib/usePagination';
import Pagination from '../../../components/admin/Pagination';
import { useAuth } from '../../../context/AuthContext';

function DeactivateUserModal({ user, onClose, onConfirmed }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/admin/users/${user.id}/toggle-active`);
      toast('User deactivated', { type: 'success' });
      onConfirmed?.();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not deactivate this user', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(user)} onClose={handleClose} size="sm" closeOnOverlayClick={!submitting}>
      {user && (
        <>
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5 bg-ink-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-soft">
                <ShieldAlert size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900 tracking-tight">Deactivate account</h2>
                <p className="text-xs text-ink-500 capitalize">{user.role} account</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              disabled={submitting}
              className="rounded-full p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors disabled:opacity-50"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-ink-700">
              Are you sure you want to deactivate <span className="font-semibold text-ink-900">{user.name}</span>&apos;s
              account? They will be logged out immediately and won&apos;t be able to sign in until an admin
              reactivates the account.
            </p>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" size="md" fullWidth onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="md" fullWidth loading={submitting} onClick={handleConfirm}>
                Deactivate
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

const ROLE_FILTERS = ['', 'customer', 'provider', 'admin', 'staff'];
const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
  { value: 'all', label: 'All' },
];

function AdminUsersContent() {
  const searchParams = useSearchParams();
  const roleParam = ROLE_FILTERS.includes(searchParams.get('role')) ? searchParams.get('role') : '';

  const { user: currentUser } = useAuth();
  const isRealAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState(roleParam);
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [roleBusyId, setRoleBusyId] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    api
      .get('/admin/users', { params: roleFilter ? { role: roleFilter } : {} })
      .then(({ data }) => setUsers(data.users || []))
      .finally(() => setLoading(false));
  };

  // Dashboard cards link here with ?role=customer / ?role=provider; follow the URL if it changes while mounted.
  useEffect(() => {
    setRoleFilter(roleParam);
  }, [roleParam]);

  useEffect(() => {
    load();
  }, [roleFilter]);

  useRefetchOnFocus(load);

  const activateUser = async (id) => {
    await api.patch(`/admin/users/${id}/toggle-active`);
    toast('User activated', { type: 'success' });
    load();
  };

  const handleStatusToggle = (u) => {
    if (u.is_active) {
      setDeactivateTarget(u);
    } else {
      activateUser(u.id);
    }
  };

  const approve = async (id) => {
    await api.patch(`/admin/providers/${id}/approve`);
    toast('Provider approved', { type: 'success' });
    load();
  };

  // Granting/revoking staff access (same permissions as admin) is restricted to real admin
  // accounts server-side too, so this button only renders for them.
  const changeRole = async (u, role) => {
    setRoleBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role });
      toast(role === 'staff' ? `${u.name} is now a staff member` : `${u.name} is no longer staff`, { type: 'success' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update this user\u2019s role', { type: 'error' });
    } finally {
      setRoleBusyId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.includes(term)
    );
  });

  const pager = usePagination(filteredUsers, { resetKey: `${roleFilter}|${statusFilter}|${search}` });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">User & Provider Accounts</h2>
          <p className="text-xs text-ink-500">Monitor active accounts, enforce suspensions, and verify providers</p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full rounded-xl border border-ink-200/80 bg-white px-4 py-2 text-xs text-ink-900 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all ${
              roleFilter === r
                ? 'bg-brand-600 text-white shadow-xs'
                : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
            }`}
          >
            {r ? `${r}s` : 'All Accounts'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              statusFilter === f.value
                ? 'bg-brand-600 text-white shadow-xs'
                : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
      )}

      {!loading && (
        <Card className="overflow-hidden p-0 border-ink-200/80 shadow-xs" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-ink-500">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">User</th>
                  <th className="px-4 py-3.5 font-semibold">Email</th>
                  <th className="px-4 py-3.5 font-semibold">Role</th>
                  <th className="px-4 py-3.5 font-semibold">Status & Badges</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {pager.pageItems.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-ink-50/40">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700 text-xs shadow-xs ring-2 ring-white">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">{u.name}</p>
                          {u.phone && <p className="text-[11px] text-ink-400">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-ink-600">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20'
                            : u.role === 'staff'
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                            : u.role === 'provider'
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-ink-400'}`} />
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                        {u.role === 'provider' && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              u.providerProfile?.is_approved ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${u.providerProfile?.is_approved ? 'bg-blue-500' : 'bg-amber-500'}`} />
                            {u.providerProfile?.is_approved ? 'Verified' : 'Pending Verification'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isRealAdmin && (u.role === 'customer' || u.role === 'staff') && (
                          <button
                            type="button"
                            disabled={roleBusyId === u.id}
                            onClick={() => changeRole(u, u.role === 'staff' ? 'customer' : 'staff')}
                            className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {u.role === 'staff' ? 'Remove staff' : 'Make staff'}
                          </button>
                        )}
                        {u.role === 'provider' && !u.providerProfile?.is_approved && (
                          <button
                            type="button"
                            onClick={() => approve(u.id)}
                            className="rounded-lg bg-trust-50 px-2.5 py-1 text-xs font-semibold text-trust-700 hover:bg-trust-100 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(u)}
                          disabled={u.role === 'admin' && !isRealAdmin}
                          title={u.role === 'admin' && !isRealAdmin ? 'Only an admin can activate or deactivate an admin account' : undefined}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            u.is_active
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <Users size={32} className="text-ink-300" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink-700">No users found</p>
              <p className="text-xs text-ink-400">Try adjusting your search query or filter selection.</p>
            </div>
          )}
        </Card>
      )}

      {!loading && <Pagination pager={pager} label="accounts" />}

      <DeactivateUserModal
        user={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirmed={() => {
          setDeactivateTarget(null);
          load();
        }}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersContent />
    </Suspense>
  );
}
