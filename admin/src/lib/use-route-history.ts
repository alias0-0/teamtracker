import { useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface RoutePoint {
  lat: number;
  lng: number;
  recorded_at: string;
}

const MIN_DISTANCE_METERS = 15;

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function downsample(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 1) return points;
  const result: RoutePoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    if (distanceMeters(last, points[i]) >= MIN_DISTANCE_METERS) {
      result.push(points[i]);
    }
  }
  return result;
}

export function useRouteHistory() {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadShiftRoute = useCallback(async (shiftId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('locations')
      .select('lat, lng, recorded_at')
      .eq('shift_id', shiftId)
      .order('recorded_at', { ascending: true });
    const raw = (data as RoutePoint[]) ?? [];
    setRawCount(raw.length);
    setPoints(downsample(raw));
    setLoading(false);
  }, []);

  const clear = useCallback(() => {
    setPoints([]);
    setRawCount(0);
  }, []);

  return { points, rawCount, loading, loadShiftRoute, clear };
}