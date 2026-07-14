import { Link } from 'react-router-dom';
import { useAllEmployees } from '@/lib/use-all-employees';

export function Employees() {
  const { employees, zones, loading, assignZone } = useAllEmployees();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="text-lg font-semibold">Manage Employees</div>
        <Link to="/" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Back to Dashboard
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-sm text-muted">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="text-sm text-muted">No registered employees yet.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Mobile</th>
                <th className="py-2 pr-4 font-medium">Department</th>
                <th className="py-2 pr-4 font-medium">Zone</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-border">
                  <td className="py-2 pr-4">{e.name}</td>
                  <td className="py-2 pr-4 text-muted">{e.email}</td>
                  <td className="py-2 pr-4 text-muted">{e.mobile ?? '—'}</td>
                  <td className="py-2 pr-4 text-muted">{e.dept ?? '—'}</td>
                  <td className="py-2 pr-4">
                    <select
                      value={e.zone_id ?? ''}
                      onChange={(ev) => assignZone(e.id, ev.target.value)}
                      className="rounded-md border border-border px-2 py-1 text-sm"
                    >
                      <option value="" disabled>
                        Select zone
                      </option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
