import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface NextSchedule {
  scheduled_start: string;
  scheduled_end: string;
}

export function useNextSchedule(employeeId: string | null | undefined) {
  const [schedule, setSchedule] = useState<NextSchedule | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setSchedule(null);
      return;
    }
    supabase
      .from('shift_schedules')
      .select('scheduled_start, scheduled_end')
      .eq('employee_id', employeeId)
      .gte('scheduled_end', new Date().toISOString())
      .order('scheduled_start')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSchedule((data as NextSchedule) ?? null));
  }, [employeeId]);

  return schedule;
}
