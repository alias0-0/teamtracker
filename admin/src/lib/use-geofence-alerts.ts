import { useEffect, useRef, useState } from 'react';
import { isPointInPolygon } from './geofence';
import type { ActiveEmployee } from './use-employees';

interface Zone {
  id: string;
  name: string;
  boundary: { lat: number; lng: number }[] | null;
}

export type GeofenceStatus = 'inside' | 'outside' | 'unknown';

export interface GeofenceAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  zoneName: string;
  timestamp: number;
}

/**
 * "unknown" means either the employee has no location yet, or their assigned
 * zone has no drawn boundary — in both cases we can't say inside/outside,
 * so we deliberately don't flag them as out of zone.
 */
export function useGeofenceAlerts(employees: ActiveEmployee[], zones: Zone[]) {
  const [statusMap, setStatusMap] = useState<Record<string, GeofenceStatus>>({});
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const prevStatus = useRef<Record<string, GeofenceStatus>>({});

  useEffect(() => {
    const nextStatus: Record<string, GeofenceStatus> = {};
    const newAlerts: GeofenceAlert[] = [];

    employees.forEach((e) => {
      if (e.lat == null || e.lng == null) {
        nextStatus[e.id] = 'unknown';
        return;
      }

      const zone = zones.find((z) => z.id === e.zone_id);
      if (!zone || !zone.boundary || zone.boundary.length < 3) {
        nextStatus[e.id] = 'unknown';
        return;
      }

      const inside = isPointInPolygon({ lat: e.lat, lng: e.lng }, zone.boundary);
      const status: GeofenceStatus = inside ? 'inside' : 'outside';
      nextStatus[e.id] = status;

      const prev = prevStatus.current[e.id];
      if (status === 'outside' && prev !== 'outside') {
        newAlerts.push({
          id: `${e.id}-${Date.now()}`,
          employeeId: e.id,
          employeeName: e.name,
          zoneName: zone.name,
          timestamp: Date.now(),
        });
      }
    });

    prevStatus.current = nextStatus;
    setStatusMap(nextStatus);
    if (newAlerts.length > 0) {
      setAlerts((prev) => [...prev, ...newAlerts]);
    }
  }, [employees, zones]);

  function dismissAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return { statusMap, alerts, dismissAlert };
}
