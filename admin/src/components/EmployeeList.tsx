import type { ActiveEmployee } from '@/lib/use-employees';

interface Props {
  employees: ActiveEmployee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EmployeeList({ employees, selectedId, onSelect }: Props) {
  if (employees.length === 0) {
    return <div className="p-4 text-sm text-muted">No employees on shift right now.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {employees.map((e) => (
        <button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className={`block w-full px-4 py-3 text-left hover:bg-surface ${
            selectedId === e.id ? 'bg-surface' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{e.name}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="On shift" />
          </div>
          <div className="mt-0.5 text-xs text-muted">{e.dept ?? 'No dept'}</div>
          <div className="mt-0.5 text-xs text-muted">
            Location assigned: {e.zone_name ?? 'None'}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            Current location: {e.lat != null && e.lng != null ? `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}` : 'Not available'}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            Updated {e.recorded_at ? new Date(e.recorded_at).toLocaleTimeString() : 'never'}
          </div>
        </button>
      ))}
    </div>
  );
}