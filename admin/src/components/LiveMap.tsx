import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import type { ActiveEmployee } from '@/lib/use-employees';
import { useReverseGeocode } from '@/lib/use-reverse-geocode';

const AL_KHOBAR = { lat: 26.2794, lng: 50.2083 };

interface Props {
  employees: ActiveEmployee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function EmployeeMarker({
  e,
  isOpen,
  onOpen,
  onClose,
  onSelect,
}: {
  e: ActiveEmployee;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const address = useReverseGeocode(e.lat, e.lng);

  return (
    <Marker
      position={{ lat: e.lat!, lng: e.lng! }}
      onClick={() => {
        onSelect(e.id);
        onOpen();
      }}
    >
      {isOpen && (
        <InfoWindow onCloseClick={onClose}>
          <div className="text-sm">
            <div className="font-semibold">{e.name}</div>
            <div className="text-gray-600">{e.mobile}</div>
            <div className="text-gray-600">{e.dept}</div>
            <div className="text-gray-600">Assigned: {e.zone_name ?? 'None'}</div>
            <div className="text-gray-600">Currently at: {address ?? 'Locating…'}</div>
            <div className="mt-1 text-xs text-gray-400">
              Updated {e.recorded_at ? new Date(e.recorded_at).toLocaleTimeString() : '—'}
            </div>
          </div>
        </InfoWindow>
      )}
    </Marker>
  );
}

export function LiveMap({ employees, selectedId, onSelect }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);

  const withLocation = employees.filter((e) => e.lat != null && e.lng != null);

  useEffect(() => {
    if (!mapRef.current || withLocation.length === 0) return;

    const selected = withLocation.find((e) => e.id === selectedId);
    if (selected) {
      mapRef.current.panTo({ lat: selected.lat!, lng: selected.lng! });
      mapRef.current.setZoom(16);
      return;
    }

    if (withLocation.length === 1) {
      mapRef.current.panTo({ lat: withLocation[0].lat!, lng: withLocation[0].lng! });
      mapRef.current.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      withLocation.forEach((e) => bounds.extend({ lat: e.lat!, lng: e.lng! }));
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [employees, selectedId]);

  if (!isLoaded) return <div className="grid h-full place-items-center text-muted">Loading map…</div>;

  return (
    <GoogleMap
      center={AL_KHOBAR}
      zoom={12}
      mapContainerClassName="h-full w-full"
      onLoad={(map) => { mapRef.current = map; }}
    >
      {withLocation.map((e) => (
        <EmployeeMarker
          key={e.id}
          e={e}
          isOpen={activeInfoId === e.id}
          onOpen={() => setActiveInfoId(e.id)}
          onClose={() => setActiveInfoId(null)}
          onSelect={onSelect}
        />
      ))}
    </GoogleMap>
  );
}