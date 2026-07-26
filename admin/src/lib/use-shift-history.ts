import { useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface ShiftEntry {
  id: string;
  started_at: string;
  ended_at: string | null;
}

export function useShiftHistory() {
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEmployeeShifts = useCallback(async (employeeId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('shifts')
      .select('id, started_at, ended_at')
      .eq('user_id', employeeId)
      .order('started_at', { ascending: false })
      .limit(50);
    setShifts((data as ShiftEntry[]) ?? []);
    setLoading(false);
  }, []);

  const clear = useCallback(() => setShifts([]), []);

  return { shifts, loading, loadEmployeeShifts, clear };
}