import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useActiveEmployees } from '@/lib/use-employees';
import { useGeofenceAlerts } from '@/lib/use-geofence-alerts';
import { useIncomingMessages } from '@/lib/use-incoming-messages';
import { LiveMap } from '@/components/LiveMap';
import { EmployeeList } from '@/components/EmployeeList';
import { SosModal } from '@/components/SosModal';

interface Zone {
  id: string;
  name: string;
  boundary: { lat: number; lng: number }[] | null;
}

interface EmployeeLookup {
  id: string;
  name: string;
}

export function Dashboard() {
  const { profile } = useAuth();
  const { employees } = useActiveEmployees();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeLookup[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('zones').select('id, name, boundary');
      setZones((data as Zone[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, name').eq('role', 'employee');
      setAllEmployees((data as EmployeeLookup[]) ?? []);
    })();
  }, []);

  const { statusMap, alerts, dismissAlert } = useGeofenceAlerts(employees, zones);
  const { alerts: messageAlerts, dismissAlert: dismissMessageAlert } = useIncomingMessages(allEmployees);

  function openMessages(employeeId: string, alertId: string) {
    dismissMessageAlert(alertId);
    navigate(`/employees?view=messages&employee=${employeeId}`);
  }

  return (
    <div className="flex h-screen flex-col">
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

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 border-b border-border bg-red-50 px-5 py-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm text-red-700">
              <span>
                <strong>{a.employeeName}</strong> left their assigned zone ({a.zoneName}) at{' '}
                {new Date(a.timestamp).toLocaleTimeString()}
              </span>
              <button onClick={() => dismissAlert(a.id)} className="text-red-700 underline">
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {messageAlerts.length > 0 && (
        <div className="flex flex-col gap-2 border-b border-border bg-blue-50 px-5 py-2">
          {messageAlerts.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm text-blue-700">
              <span>
                <strong>{m.employeeName}</strong>: {m.body}
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => openMessages(m.employeeId, m.id)} className="underline">
                  View
                </button>
                <button onClick={() => dismissMessageAlert(m.id)} className="underline">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <LiveMap
            employees={employees}
            selectedId={selectedId}
            onSelect={setSelectedId}
            zones={zones}
            statusMap={statusMap}
          />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            On shift ({employees.length})
          </div>
          <EmployeeList
            employees={employees}
            selectedId={selectedId}
            onSelect={setSelectedId}
            statusMap={statusMap}
          />
        </aside>
      </div>

      {sosOpen && profile && (
        <SosModal
          adminId={profile.id}
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          onClose={() => setSosOpen(false)}
        />
      )}
    </div>
  );
}