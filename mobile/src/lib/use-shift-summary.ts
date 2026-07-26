import { useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface ShiftSummary {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  distanceMeters: number;
  zoneName: string | null;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useShiftSummary() {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const buildSummary = useCallback(
    async (shiftId: string, startedAt: string, zoneName: string | null) => {
      setLoading(true);
      const endedAt = new Date().toISOString();

      const { data } = await supabase
        .from('locations')
        .select('lat, lng, recorded_at')
        .eq('shift_id', shiftId)
        .order('recorded_at', { ascending: true });

      const points = (data as { lat: number; lng: number; recorded_at: string }[]) ?? [];

      let distance = 0;
      for (let i = 1; i < points.length; i++) {
        distance += haversineMeters(points[i - 1], points[i]);
      }

      const durationMinutes = Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
      );

      const result: ShiftSummary = {
        startedAt,
        endedAt,
        durationMinutes,
        distanceMeters: Math.round(distance),
        zoneName,
      };
      setSummary(result);
      setLoading(false);
      return result;
    },
    [],
  );

  const clear = useCallback(() => setSummary(null), []);

  return { summary, loading, buildSummary, clear };
}