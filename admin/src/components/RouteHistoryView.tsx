import { useEffect, useState } from 'react';
import { GoogleMap, Marker, Polyline, useLoadScript } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import { useRouteHistory } from '@/lib/use-route-history';

const AL_KHOBAR = { lat: 26.2794, lng: 50.2083 };

interface Employee {
  id: string;
  name: string;
}

interface ShiftOption {
  id: string;
  started_at: string;
  ended_at: string | null;
}

interface Props {
  employees: Employee[];
}

export function RouteHistoryView({ employees }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const { points, rawCount, loading, loadShiftRoute, clear } = useRouteHistory();

  useEffect(() => {
    if (!selectedEmployeeId) {
      setShiftOptions([]);
      setSelectedShiftId('');
      clear();
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('shifts')
        .select('id, started_at, ended_at')
        .eq('user_id', selectedEmployeeId)
        .order('started_at', { ascending: false })
        .limit(30);
      setShiftOptions((data as ShiftOption[]) ?? []);
      setSelectedShiftId('');
      clear();
    })();
  }, [selectedEmployeeId, clear]);

  useEffect(() => {
    if (selectedShiftId) loadShiftRoute(selectedShiftId);
    else clear();
  }, [selectedShiftId, loadShiftRoute, clear]);

  if (!isLoaded) return <div className="p-5 text-sm text-muted">Loading map…</div>;

  const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
  const center = path.length > 0 ? path[Math.floor(path.length / 2)] : AL_KHOBAR;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="rounded-md border border-border px-2 py-1 text-sm"
        >
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <select
          value={selectedShiftId}
          onChange={(e) => setSelectedShiftId(e.target.value)}
          disabled={shiftOptions.length === 0}
          className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-50"
        >
          <option value="">Select shift…</option>
          {shiftOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.started_at).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
              {s.ended_at ? ' – ' + new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ' (active)'}
            </option>
          ))}
        </select>

        {loading && <span className="text-xs text-muted">Loading route…</span>}
        {!loading && selectedShiftId && (
          <span className="text-xs text-muted">
            {points.length} stops shown ({rawCount} raw pings)
          </span>
        )}
      </div>

      <div className="flex-1">
        <GoogleMap center={center} zoom={path.length > 0 ? 14 : 12} mapContainerClassName="h-full w-full">
          {path.length > 0 && (
            <>
              <Polyline path={path} options={{ strokeColor: '#1e4fd1', strokeWeight: 3, strokeOpacity: 0.8 }} />
              <Marker position={path[0]} label={{ text: 'Start', color: '#fff', fontSize: '10px' }} />
              <Marker position={path[path.length - 1]} label={{ text: 'End', color: '#fff', fontSize: '10px' }} />
            </>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}