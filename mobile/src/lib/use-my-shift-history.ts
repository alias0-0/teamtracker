import { useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface MyShiftEntry {
  id: string;
  started_at: string;
  ended_at: string | null;
}

export function useMyShiftHistory() {
  const [shifts, setShifts] = useState<MyShiftEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setShifts([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('shifts')
      .select('id, started_at, ended_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(30);
    setShifts((data as MyShiftEntry[]) ?? []);
    setLoading(false);
  }, []);

  return { shifts, loading, load };
}