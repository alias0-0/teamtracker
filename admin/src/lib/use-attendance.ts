import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { isPointInPolygon } from './geofence';

export interface AttendanceRow {
  scheduleId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: 'upcoming' | 'on-time' | 'late' | 'outside-zone' | 'no-show';
  minutesLate: number | null;
  overtimeMinutes: number | null; // positive = worked over, negative = ended early
}

const LATE_THRESHOLD_MINUTES = 10;
const OVERTIME_THRESHOLD_MINUTES = 5;

export function useAttendance(employeeId: string | null) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!employeeId) {
      setRows([]);
      return;
    }
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [{ data: schedules }, { data: shifts }] = await Promise.all([
      supabase
        .from('shift_schedules')
        .select('id, scheduled_start, scheduled_end')
        .eq('employee_id', employeeId)
        .gte('scheduled_start', since.toISOString())
        .order('scheduled_start', { ascending: false }),
      supabase
        .from('shifts')
        .select('id, started_at, ended_at, zone_boundary_snapshot')
        .eq('user_id', employeeId)
        .gte('started_at', since.toISOString()),
    ]);

    const usedShiftIds = new Set<string>();
    const MATCH_WINDOW_HOURS_BEFORE = 2;

    const result: AttendanceRow[] = (schedules ?? []).map((s: any) => {
      const scheduledStartMs = new Date(s.scheduled_start).getTime();
      const scheduledEndMs = new Date(s.scheduled_end).getTime();
      const windowStartMs = scheduledStartMs - MATCH_WINDOW_HOURS_BEFORE * 60 * 60 * 1000;

      const candidates = (shifts ?? [])
        .filter((sh: any) => !usedShiftIds.has(sh.id))
        .filter((sh: any) => {
          const startedMs = new Date(sh.started_at).getTime();
          return startedMs >= windowStartMs && startedMs <= scheduledEndMs;
        })
        .sort(
          (a: any, b: any) =>
            Math.abs(new Date(a.started_at).getTime() - scheduledStartMs) -
            Math.abs(new Date(b.started_at).getTime() - scheduledStartMs),
        );

      const matchingShift = candidates[0];

      let status: AttendanceRow['status'];
      let minutesLate: number | null = null;
      let overtimeMinutes: number | null = null;

      if (matchingShift) {
        usedShiftIds.add(matchingShift.id);

        const diffMinutes = Math.round(
          (new Date(matchingShift.started_at).getTime() - scheduledStartMs) / 60000,
        );
        minutesLate = diffMinutes;

        const boundary = matchingShift.zone_boundary_snapshot as
          | { lat: number; lng: number }[]
          | null;

        let wasOutsideZone = false;
        if (boundary && boundary.length >= 3) {
          // Approximate using shift's own recorded start point is not stored separately here;
          // outside-zone determination uses whether ANY location during the shift fell outside.
          // (Location check done lazily below only if needed.)
          wasOutsideZone = false; // resolved below via locations query batch
        }

        if (diffMinutes > LATE_THRESHOLD_MINUTES) {
          status = 'late';
        } else {
          status = 'on-time'; // may be downgraded to outside-zone below
        }

        if (matchingShift.ended_at) {
          const endedMs = new Date(matchingShift.ended_at).getTime();
          overtimeMinutes = Math.round((endedMs - scheduledEndMs) / 60000);
          if (Math.abs(overtimeMinutes) < OVERTIME_THRESHOLD_MINUTES) overtimeMinutes = null;
        }
      } else if (Date.now() > scheduledEndMs) {
        status = 'no-show';
      } else {
        status = 'upcoming';
      }

      return {
        scheduleId: s.id,
        scheduledStart: s.scheduled_start,
        scheduledEnd: s.scheduled_end,
        actualStart: matchingShift?.started_at ?? null,
        actualEnd: matchingShift?.ended_at ?? null,
        status,
        minutesLate,
        overtimeMinutes,
        _shiftId: matchingShift?.id ?? null,
        _boundary: matchingShift?.zone_boundary_snapshot ?? null,
      } as any;
    });

    // Resolve outside-zone status using actual location pings, only for rows that matched a shift
    const shiftIdsNeedingCheck = result
      .filter((r: any) => r._shiftId && r._boundary && r._boundary.length >= 3 && r.status === 'on-time')
      .map((r: any) => r._shiftId);

    if (shiftIdsNeedingCheck.length > 0) {
      const { data: locations } = await supabase
        .from('locations')
        .select('shift_id, lat, lng')
        .in('shift_id', shiftIdsNeedingCheck);

      const pointsByShift = new Map<string, { lat: number; lng: number }[]>();
      for (const loc of locations ?? []) {
        const arr = pointsByShift.get((loc as any).shift_id) ?? [];
        arr.push({ lat: (loc as any).lat, lng: (loc as any).lng });
        pointsByShift.set((loc as any).shift_id, arr);
      }

      for (const r of result as any[]) {
        if (!r._shiftId || r.status !== 'on-time') continue;
        const boundary = r._boundary;
        if (!boundary || boundary.length < 3) continue;
        const points = pointsByShift.get(r._shiftId) ?? [];
        if (points.length === 0) continue;
        const anyOutside = points.some((p) => !isPointInPolygon(p, boundary));
        if (anyOutside) r.status = 'outside-zone';
      }
    }

    result.forEach((r: any) => {
      delete r._shiftId;
      delete r._boundary;
    });

    setRows(result as AttendanceRow[]);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}