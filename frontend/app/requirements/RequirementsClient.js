'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPinned, PenSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import RequirementCard from '../../components/RequirementCard';
import Button from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import useGeolocation from '../../lib/useGeolocation';

const RequirementComposerModal = dynamic(() => import('../../components/RequirementComposerModal'));

export default function RequirementsClient() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const { coords, status: geoStatus } = useGeolocation();

  const reloadRequirements = () => {
    setLoadingRequirements(true);
    const params = { limit: 9 };

    if (coords) {
      params.lat = coords.lat;
      params.lng = coords.lng;
    }
    api
      .get('/requirements', { params })
      .then(({ data }) => setRequirements(data.requirements || []))
      .catch(() => setRequirements([]))
      .finally(() => setLoadingRequirements(false));
  };

  useEffect(() => {
    // Providers are matched against their registered service location by the
    // backend, so their requirement feed should not wait for browser GPS.
    // Customers/guests use the current browser location when available.
    if (user?.role !== 'provider' && (geoStatus === 'idle' || geoStatus === 'locating')) {
      return;
    }

    reloadRequirements();
  }, [geoStatus, coords, user?.role]);

  const handleRequirementCreated = (requirement) =>
    setRequirements((prev) => [requirement, ...prev]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    if (!token) return undefined;
    const socket = getSocket(token);

    const onClosed = ({ requirement_id }) => {
      setRequirements((prev) => prev.filter((r) => r.id !== requirement_id));
    };

    const onNewRequirement = (requirement) => {
      if (user?.role !== 'provider') return;
      setRequirements((prev) =>
        prev.some((r) => r.id === requirement.id) ? prev : [requirement, ...prev]
      );
    };

    // Catch up after a reconnect so requirements created while the socket
    // was temporarily disconnected are not missed.
    let hasConnectedBefore = socket.connected;
    const onConnect = () => {
      if (hasConnectedBefore) reloadRequirements();
      hasConnectedBefore = true;
    };

    socket.on('requirement_closed', onClosed);
    socket.on('requirement:new', onNewRequirement);
    socket.on('connect', onConnect);

    return () => {
      socket.off('requirement_closed', onClosed);
      socket.off('requirement:new', onNewRequirement);
      socket.off('connect', onConnect);
    };
  }, [user?.role]);

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
              <MapPinned size={14} aria-hidden="true" /> Live Local Demand
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Requirements Near You
            </h1>
            <p className="mt-1 text-xs text-ink-500">
              {geoStatus === 'ready' && coords
                ? user?.role === 'admin' || user?.role === 'staff'
                  ? 'Showing all active requirements'
                  : user?.role === 'provider'
                    ? 'Showing jobs within your service radius of current location'
                    : user
                      ? `Showing requirements within your ${user.requirement_radius_km ?? 5} km radius`
                      : 'Showing requirements within 5 km of your location'
                : user?.role === 'admin' || user?.role === 'staff'
                  ? 'Showing all active requirements'
                  : user?.role === 'provider'
                    ? 'Enable location to see jobs within your service radius'
                    : user
                      ? 'Enable location to see requirements within your radius'
                      : 'Enable location in browser to discover verified requirements nearest to you'}
            </p>
          </div>

          {user?.role === 'customer' && (
            <Button
              size="md"
              icon={<PenSquare size={16} aria-hidden="true" />}
              onClick={() => setComposerOpen(true)}
            >
              Post a Requirement
            </Button>
          )}
        </div>

        {!loadingRequirements && requirements.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white p-12 text-center shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <MapPinned size={26} aria-hidden="true" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-800">No active requirements nearby yet</h3>
            <p className="max-w-md text-xs text-ink-500">
              Be the first to post what you need done. Local providers will be notified instantly to quote!
            </p>
            {user?.role === 'customer' && (
              <Button size="sm" onClick={() => setComposerOpen(true)}>
                Post First Requirement
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loadingRequirements &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          {!loadingRequirements &&
            requirements.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <RequirementCard requirement={r} onUpdated={reloadRequirements} />
              </motion.div>
            ))}
        </div>
      </motion.section>

      <RequirementComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={handleRequirementCreated}
      />
    </div>
  );
}