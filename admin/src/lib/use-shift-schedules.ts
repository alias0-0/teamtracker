import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface ScheduleEntry {
  id: string;
  employee_id: string;
  scheduled_start: string;
  scheduled_end: string;
}

export function useShiftSchedules(employeeId: string | null) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!employeeId) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('shift_schedules')
      .select('id, employee_id, scheduled_start, scheduled_end')
      .eq('employee_id', employeeId)
      .gte('scheduled_end', new Date().toISOString())
      .order('scheduled_start');
    if (!error) setSchedules((data as ScheduleEntry[]) ?? []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addSchedule(start: string, end: string) {
    if (!employeeId) return 'No employee selected';
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not signed in';

    const { error } = await supabase.from('shift_schedules').insert({
      employee_id: employeeId,
      scheduled_start: start,
      scheduled_end: end,
      created_by: user.id,
    });
    if (error) return error.message;
    await refresh();
    return null;
  }

  async function deleteSchedule(id: string) {
    const { error } = await supabase.from('shift_schedules').delete().eq('id', id);
    if (!error) setSchedules((prev) => prev.filter((s) => s.id !== id));
    return error?.message ?? null;
  }

  return { schedules, loading, addSchedule, deleteSchedule, refresh };
}
