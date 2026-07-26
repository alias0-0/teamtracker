import { useRef, useState } from 'react';
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';

const AL_KHOBAR = { lat: 26.2794, lng: 50.2083 };

interface Zone {
  id: string;
  name: string;
  boundary: { lat: number; lng: number }[] | null;
}

interface Props {
  zones: Zone[];
  onSaved: () => void;
}

export function ZoneEditor({ zones, onSaved }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<{ lat: number; lng: number }[]>([]);
  const [saving, setSaving] = useState(false);

  function centroidOf(path: { lat: number; lng: number }[]) {
    const total = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
    return { lat: total.lat / path.length, lng: total.lng / path.length };
  }

  function flyToZone(zone: Zone | undefined) {
    if (!zone || !mapRef.current) return;
    if (zone.boundary && zone.boundary.length > 0) {
      mapRef.current.panTo(centroidOf(zone.boundary));
      mapRef.current.setZoom(15);
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: `${zone.name}, Saudi Arabia` }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        mapRef.current!.panTo({ lat: loc.lat(), lng: loc.lng() });
        mapRef.current!.setZoom(13);
      }
    });
  }

  function syncPathFromPolygon() {
    if (!polygonRef.current) return;
    const path = polygonRef.current
      .getPath()
      .getArray()
      .map((p) => ({ lat: p.lat(), lng: p.lng() }));
    setCurrentPath(path);
  }

  function attachPathListeners(polygon: google.maps.Polygon) {
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];
    const path = polygon.getPath();
    listenersRef.current.push(
      google.maps.event.addListener(path, 'set_at', syncPathFromPolygon),
      google.maps.event.addListener(path, 'insert_at', syncPathFromPolygon),
      google.maps.event.addListener(path, 'remove_at', syncPathFromPolygon),
    );
  }

  function selectZone(id: string) {
    setSelectedZoneId(id);
    if (!id) {
      setCurrentPath([]);
      return;
    }
    const z = zones.find((zone) => zone.id === id);
    setCurrentPath(z?.boundary ?? []);
    flyToZone(z);
  }

  function handleMapClick(e: google.maps.MapMouseEvent) {
    if (!selectedZoneId || !e.latLng) return;
    setCurrentPath((prev) => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }]);
  }

  async function save() {
    if (!selectedZoneId) return;
    if (currentPath.length > 0 && currentPath.length < 3) return;
    setSaving(true);
    await supabase
      .from('zones')
      .update({ boundary: currentPath.length === 0 ? null : currentPath })
      .eq('id', selectedZoneId);
    setSaving(false);
    onSaved();
  }

  function clear() {
    setCurrentPath([]);
  }

  function undoLastPoint() {
    setCurrentPath((prev) => prev.slice(0, -1));
  }

  if (!isLoaded) return <div className="p-4 text-sm text-muted">Loading map…</div>;

  const saveDisabled = saving || !selectedZoneId || (currentPath.length > 0 && currentPath.length < 3);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <select
          value={selectedZoneId}
          onChange={(e) => selectZone(e.target.value)}
          className="rounded-md border border-border px-2 py-1 text-sm"
        >
          <option value="">Select zone…</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          {selectedZoneId ? `${currentPath.length} points (need at least 3)` : 'Select a zone to begin'}
        </span>
        <button onClick={undoLastPoint} className="rounded-md border border-border px-3 py-1.5 text-sm">
          Undo last point
        </button>
        <button onClick={clear} className="rounded-md border border-border px-3 py-1.5 text-sm">
          Clear shape
        </button>
        <button
          onClick={save}
          disabled={saveDisabled}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save boundary'}
        </button>
      </div>

      <div className="flex-1">
        <GoogleMap
          center={AL_KHOBAR}
          zoom={12}
          mapContainerClassName="h-full w-full"
          onClick={handleMapClick}
          onLoad={(map) => {
            mapRef.current = map;
          }}
        >
          {currentPath.length > 0 && (
            <Polygon
              key={selectedZoneId}
              path={currentPath}
              editable
              onLoad={(polygon) => {
                polygonRef.current = polygon;
                attachPathListeners(polygon);
              }}
              onUnmount={() => {
                listenersRef.current.forEach((l) => l.remove());
                listenersRef.current = [];
              }}
              options={{
                fillColor: '#1e4fd1',
                fillOpacity: 0.2,
                strokeColor: '#1e4fd1',
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}