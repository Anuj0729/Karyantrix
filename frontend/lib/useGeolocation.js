'use client';

import { useEffect, useState } from 'react';

export default function useGeolocation({ auto = true } = {}) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');

  const request = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ready');
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  };

  useEffect(() => {
    if (auto) request();
  }, []);

  return { coords, status, request };
}
