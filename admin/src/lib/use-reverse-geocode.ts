import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

export function useReverseGeocode(lat: number | null, lng: number | null) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) {
      setAddress(null);
      return;
    }

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (cache.has(key)) {
      setAddress(cache.get(key)!);
      return;
    }

    let cancelled = false;
    fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const result = data.results?.[0]?.formatted_address ?? 'Unknown location';
        cache.set(key, result);
        setAddress(result);
      })
      .catch(() => {
        if (!cancelled) setAddress('Unknown location');
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return address;
}
