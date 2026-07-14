import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface ActiveEmployee {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  dept: string | null;
  zone_id: string | null;
  zone_name: string | null;
  shift_id: string;
  started_at: string;
  lat: number | null;
  lng: number | null;
  recorded_at: string | null;
}

export function useActiveEmployees() {
  const [employees, setEmployees] = useState<ActiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from('active_employees_view').select('*');
    if (!error) setEmployees((data ?? []) as ActiveEmployee[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('locations-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, refresh)
      .subscribe();

    const poll = setInterval(refresh, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [refresh]);

  return { employees, loading, refresh };
}
