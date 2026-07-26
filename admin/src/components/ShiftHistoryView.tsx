import { useState } from 'react';
import { useShiftHistory } from '@/lib/use-shift-history';

interface Employee {
  id: string;
  name: string;
}

interface Props {
  employees: Employee[];
}

function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function ShiftHistoryView({ employees }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { shifts, loading, loadEmployeeShifts, clear } = useShiftHistory();

  function handleSelect(id: string) {
    setSelectedEmployeeId(id);
    if (id) loadEmployeeShifts(id);
    else clear();
  }

  const totalMinutes = shifts.reduce((sum, s) => {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    return sum + (end - start) / 60000;
  }, 0);
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = Math.round(totalMinutes % 60);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <select
          value={selectedEmployeeId}
          onChange={(e) => handleSelect(e.target.value)}
          className="rounded-md border border-border px-2 py-1 text-sm"
        >
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {shifts.length > 0 && (
          <span className="text-sm text-muted">
            {shifts.length} shift{shifts.length === 1 ? '' : 's'} · total {totalH}h {totalM}m
          </span>
        )}
      </div>

      {!selectedEmployeeId ? (
        <div className="p-5 text-sm text-muted">Select an employee to view their shift history.</div>
      ) : loading ? (
        <div className="p-5 text-sm text-muted">Loading…</div>
      ) : shifts.length === 0 ? (
        <div className="p-5 text-sm text-muted">No shifts recorded for this employee.</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Start</th>
                <th className="py-2 pr-4 font-medium">End</th>
                <th className="py-2 pr-4 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="py-2 pr-4">{new Date(s.started_at).toLocaleDateString()}</td>
                  <td className="py-2 pr-4 text-muted">
                    {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {s.ended_at
                      ? new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'In progress'}
                  </td>
                  <td className="py-2 pr-4">{formatDuration(s.started_at, s.ended_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}