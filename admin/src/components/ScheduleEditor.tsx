import { useState } from 'react';
import { useShiftSchedules } from '@/lib/use-shift-schedules';

interface Employee {
  id: string;
  name: string;
}

interface Props {
  employees: Employee[];
}

export function ScheduleEditor({ employees }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { schedules, loading, addSchedule, deleteSchedule } = useShiftSchedules(
    selectedEmployeeId || null,
  );
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setError('');
    if (!date || !startTime || !endTime) {
      setError('Fill in date, start time, and end time');
      return;
    }
    const start = new Date(`${date}T${startTime}`).toISOString();
    const end = new Date(`${date}T${endTime}`).toISOString();
    if (new Date(end) <= new Date(start)) {
      setError('End time must be after start time');
      return;
    }
    setSaving(true);
    const err = await addSchedule(start, end);
    setSaving(false);
    if (err) setError(err);
    else {
      setDate('');
      setStartTime('');
      setEndTime('');
    }
  }

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
        <div className="p-5 text-sm text-muted">Select an employee to view or add scheduled shifts.</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-md border border-border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">End time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-md border border-border px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add Schedule'}
            </button>
          </div>

          {error && <div className="mb-4 text-sm text-danger">{error}</div>}

          <div className="text-sm font-semibold text-muted">Upcoming schedules</div>
          {loading ? (
            <div className="mt-2 text-sm text-muted">Loading…</div>
          ) : schedules.length === 0 ? (
            <div className="mt-2 text-sm text-muted">No upcoming schedules for this employee.</div>
          ) : (
            <div className="mt-2 divide-y divide-border">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {new Date(s.scheduled_start).toLocaleDateString()}{' '}
                    {new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(s.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => deleteSchedule(s.id)} className="text-danger underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
