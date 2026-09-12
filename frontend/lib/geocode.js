const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

const formatAddress = (data) => {
  const a = data?.address || {};

  let streetLine = [a.house_number, a.road].filter(Boolean).join(' ');
  if (!streetLine) streetLine = a.hamlet || null;

  const parts = [
    streetLine,
    a.neighbourhood,
    a.suburb && a.suburb !== a.neighbourhood ? a.suburb : null,
    a.city_district,
    a.city || a.town || a.village || a.county,
    a.state,
    a.postcode,
  ].filter(Boolean);

  const unique = [...new Set(parts)];
  if (unique.length > 0) return unique.join(', ');
  return data?.display_name || null;
};

const fetchReverse = async (lat, lng, signal) => {
  const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) return null;
  return res.json();
};

export async function reverseGeocode(lat, lng, { signal } = {}) {
  try {
    const data = await fetchReverse(lat, lng, signal);
    if (!data) return null;
    return formatAddress(data);
  } catch (err) {

    return null;
  }
}

export async function reverseGeocodeDetailed(lat, lng, { signal } = {}) {
  try {
    const data = await fetchReverse(lat, lng, signal);
    if (!data) return null;
    const a = data?.address || {};
    return {
      text: formatAddress(data),
      city: a.city || a.town || a.village || a.county || null,
    };
  } catch (err) {
    return null;
  }
}

export async function forwardGeocode(query, { signal } = {}) {
  const q = (query || '').trim();
  if (q.length < 3) return null;
  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const best = data[0];
    return {
      lat: Number(best.lat),
      lng: Number(best.lon),
      text: formatAddress(best) || best.display_name,
    };
  } catch (err) {
    return null;
  }
}
