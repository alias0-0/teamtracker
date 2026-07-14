import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useActiveEmployees } from '@/lib/use-employees';
import { LiveMap } from '@/components/LiveMap';
import { EmployeeList } from '@/components/EmployeeList';
import { SosModal } from '@/components/SosModal';

export function Dashboard() {
  const { profile } = useAuth();
  const { employees } = useActiveEmployees();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="text-lg font-semibold">Team Tracker</div>
        <div className="flex items-center gap-3">
          <Link to="/employees" className="rounded-md border border-border px-3 py-1.5 text-sm">
            Manage Employees
          </Link>
          <button
            onClick={() => setSosOpen(true)}
            className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white"
          >
            Send SOS
          </button>
          <span className="text-sm text-muted">{profile?.name}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <LiveMap employees={employees} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            On shift ({employees.length})
          </div>
          <EmployeeList employees={employees} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
      </div>

      {sosOpen && profile && <SosModal adminId={profile.id} onClose={() => setSosOpen(false)} />}
    </div>
  );
}