import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  dept: string | null;
  zone_id: string | null;
  zone_name: string | null;
  active: boolean;
}

export interface Zone {
  id: string;
  name: string;
}

export function useAllEmployees() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [employeesRes, zonesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, mobile, dept, zone_id, active, zones(name)')
        .eq('role', 'employee')
        .order('name'),
      supabase.from('zones').select('id, name').order('name'),
    ]);

    if (!employeesRes.error) {
      setEmployees(
        (employeesRes.data ?? []).map((e: any) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          mobile: e.mobile,
          dept: e.dept,
          zone_id: e.zone_id,
          zone_name: e.zones?.name ?? null,
          active: e.active,
        })),
      );
    }
    if (!zonesRes.error) setZones((zonesRes.data as Zone[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function assignZone(employeeId: string, zoneId: string) {
    const { error } = await supabase.from('profiles').update({ zone_id: zoneId }).eq('id', employeeId);
    if (!error) {
      const zoneName = zones.find((z) => z.id === zoneId)?.name ?? null;
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, zone_id: zoneId, zone_name: zoneName } : e)),
      );
    }
    return error;
  }

  return { employees, zones, loading, refresh, assignZone };
}
