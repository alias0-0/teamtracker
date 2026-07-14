import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { useAuth } from './lib/auth';

export function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>;
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : !isAdmin ? (
            <div className="grid min-h-screen place-items-center px-6 text-center text-muted">
              This account is not an admin account.
            </div>
          ) : (
            <Dashboard />
          )
        }
      />
      <Route
        path="/employees"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : !isAdmin ? (
            <div className="grid min-h-screen place-items-center px-6 text-center text-muted">
              This account is not an admin account.
            </div>
          ) : (
            <Employees />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}