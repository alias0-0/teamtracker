import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAllEmployees } from '@/lib/use-all-employees';
import { ZoneEditor } from '@/components/ZoneEditor';
import { ScheduleEditor } from '@/components/ScheduleEditor';
import { AttendanceView } from '@/components/AttendanceView';
import { RouteHistoryView } from '@/components/RouteHistoryView';
import { MessagesView } from '@/components/MessagesView';

type View = 'list' | 'zones' | 'schedule' | 'attendance' | 'routes' | 'messages';

export function Employees() {
  const { employees, zones, loading, assignZone, bulkAssignZone, refresh } = useAllEmployees();
  const [view, setView] = useState<View>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkZoneId, setBulkZoneId] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === employees.length ? [] : employees.map((e) => e.id)));
  }

  async function handleBulkAssign() {
    if (!bulkZoneId || selectedIds.length === 0) return;
    setBulkSaving(true);
    await bulkAssignZone(selectedIds, bulkZoneId);
    setBulkSaving(false);
    setSelectedIds([]);
    setBulkZoneId('');
  }

  async function toggleActive(employeeId: string, currentActive: boolean) {
    await supabase.from('profiles').update({ active: !currentActive }).eq('id', employeeId);
    await refresh();
  }

  const employeeNames = employees.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="text-lg font-semibold">Manage Employees</div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setView('list')} className={`rounded-md border px-3 py-1.5 text-sm ${view === 'list' ? 'border-accent text-accent' : 'border-border'}`}>Employees</button>
          <button onClick={() => setView('zones')} className={`rounded-md border px-3 py-1.5 text-sm ${view === 'zones' ? 'border-accent text-accent' : 'border-border'}`}>Edit Zone Boundaries</button>
          <button onClick={() => setView('schedule')} className={`rounded-md border px-3 py-1.5 text-sm ${view === 'schedule' ? 'border-accent text-accent' : 'border-border'}`}>Shift Schedules</button>
          <button onClick={() => setView('attendance')} className={`rounded-md border px-3 py-1.5 text-sm ${view === 'attendance' ? 'border-accent text-accent' : 'border-border'}`}>Attendance</button>
          <button onClick={() => setView('routes')} className={`rounded-md border px-3 py-1.5 text-sm ${view === 'routes' ? 'border-accent text-accent' : 'border-border'}`}>Route History</button>
          <button onClick={() => setView('messages')} className={`rounded-md border px-3 py-1.5 text-sm ${view === 'messages' ? 'border-accent text-accent' : 'border-border'}`}>Messages</button>
          <Link to="/" className="rounded-md border border-border px-3 py-1.5 text-sm">Back to Dashboard</Link>
        </div>
      </header>

      {view === 'zones' ? (
        <div className="flex-1"><ZoneEditor zones={zones as any} onSaved={refresh} /></div>
      ) : view === 'schedule' ? (
        <div className="flex-1"><ScheduleEditor employees={employeeNames} /></div>
      ) : view === 'attendance' ? (
        <AttendanceView employees={employeeNames} />
      ) : view === 'routes' ? (
        <RouteHistoryView employees={employeeNames} />
      ) : view === 'messages' ? (
        <div className="flex-1"><MessagesView employees={employeeNames} /></div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-2.5">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <select value={bulkZoneId} onChange={(e) => setBulkZoneId(e.target.value)} className="rounded-md border border-border px-2 py-1 text-sm">
                <option value="">Assign zone…</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <button onClick={handleBulkAssign} disabled={!bulkZoneId || bulkSaving} className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                {bulkSaving ? 'Applying…' : 'Apply to selected'}
              </button>
              <button onClick={() => setSelectedIds([])} className="text-sm text-muted underline">Clear selection</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="text-sm text-muted">Loading…</div>
            ) : employees.length === 0 ? (
              <div className="text-sm text-muted">No registered employees yet.</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-4 font-medium"><input type="checkbox" checked={selectedIds.length === employees.length && employees.length > 0} onChange={toggleSelectAll} /></th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Mobile</th>
                    <th className="py-2 pr-4 font-medium">Department</th>
                    <th className="py-2 pr-4 font-medium">Zone</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className={`border-b border-border ${!e.active ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-4"><input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggleSelect(e.id)} /></td>
                      <td className="py-2 pr-4">{e.name}</td>
                      <td className="py-2 pr-4 text-muted">{e.email}</td>
                      <td className="py-2 pr-4 text-muted">{e.mobile ?? '—'}</td>
                      <td className="py-2 pr-4 text-muted">{e.dept ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <select value={e.zone_id ?? ''} onChange={(ev) => assignZone(e.id, ev.target.value)} disabled={!e.active} className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-50">
                          <option value="" disabled>Select zone</option>
                          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <button onClick={() => toggleActive(e.id, e.active)} className={`rounded-md border px-3 py-1 text-xs font-medium ${e.active ? 'border-danger text-danger' : 'border-emerald-600 text-emerald-600'}`}>
                          {e.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}