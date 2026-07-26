import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEPARTMENTS } from '@/constants/departments';

interface Employee {
  id: string;
  name: string;
}

interface Props {
  adminId: string;
  employees: Employee[];
  onClose: () => void;
}

type TargetMode = 'all' | 'employee' | 'department';

export function SosModal({ adminId, employees, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<TargetMode>('all');
  const [employeeId, setEmployeeId] = useState('');
  const [dept, setDept] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!message.trim()) return;
    if (mode === 'employee' && !employeeId) return setError('Select an employee');
    if (mode === 'department' && !dept) return setError('Select a department');

    setBusy(true);
    setError('');
    const { error } = await supabase.from('sos_broadcasts').insert({
      admin_id: adminId,
      message: message.trim(),
      target_employee_id: mode === 'employee' ? employeeId : null,
      target_dept: mode === 'department' ? dept : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-bg p-6 shadow-lg">
        <div className="mb-1 text-lg font-semibold text-danger">Send SOS</div>
        <div className="mb-4 text-sm text-muted">Choose who this alert goes to.</div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('all')}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${mode === 'all' ? 'border-accent text-accent' : 'border-border'}`}
          >
            Everyone
          </button>
          <button
            onClick={() => setMode('department')}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${mode === 'department' ? 'border-accent text-accent' : 'border-border'}`}
          >
            Department
          </button>
          <button
            onClick={() => setMode('employee')}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${mode === 'employee' ? 'border-accent text-accent' : 'border-border'}`}
          >
            Employee
          </button>
        </div>

        {mode === 'department' && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Department</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'employee' && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="mb-1 block text-sm font-medium">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="Describe the emergency or urgent request…"
        />

        {error && <div className="mt-2 text-sm text-danger">{error}</div>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={busy || !message.trim()}
            className="flex-1 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Confirm & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}