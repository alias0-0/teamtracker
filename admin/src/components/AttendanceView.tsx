import { useState } from 'react';
import { useAttendance } from '@/lib/use-attendance';

interface Employee {
  id: string;
  name: string;
}

interface Props {
  employees: Employee[];
}

const STATUS_STYLES: Record<string, string> = {
  'on-time': 'text-emerald-600',
  late: 'text-amber-600',
  'outside-zone': 'text-danger',
  'no-show': 'text-danger',
  upcoming: 'text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  'on-time': 'On time',
  late: 'Late',
  'outside-zone': 'Outside zone',
  'no-show': 'No show',
  upcoming: 'Upcoming',
};

function formatDuration(mins: number) {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}m`;
}

export function AttendanceView({ employees }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { rows, loading } = useAttendance(selectedEmployeeId || null);

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
      </div>

      {!selectedEmployeeId ? (
        <div className="p-5 text-sm text-muted">Select an employee to view their attendance.</div>
      ) : loading ? (
        <div className="p-5 text-sm text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-5 text-sm text-muted">No scheduled shifts in the last 30 days.</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Start Time</th>
                <th className="py-2 pr-4 font-medium">End Time</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.scheduleId} className="border-b border-border">
                  <td className="py-2 pr-4 text-muted">
                    {new Date(r.scheduledStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-2 pr-4">
                    {r.actualStart ? (
                      new Date(r.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-muted">
                        {new Date(r.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (sched)
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {r.actualEnd ? (
                      new Date(r.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-muted">
                        {new Date(r.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (sched)
                      </span>
                    )}
                  </td>
                  <td className={`py-2 pr-4 font-medium ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                    {r.status === 'late' && r.minutesLate != null && ` (${r.minutesLate}m)`}
                    {r.overtimeMinutes != null && (
                      <span className={`ml-2 ${r.overtimeMinutes > 0 ? 'text-emerald-600' : 'text-danger'}`}>
                        {r.overtimeMinutes > 0 ? '+' : '-'}
                        {formatDuration(r.overtimeMinutes)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}