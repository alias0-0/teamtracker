import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/login';
import { Admin } from './pages/admin';
import { Employee } from './pages/employee';
import { useAuth } from './lib/auth';

export function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(profile?.role)} replace /> : <Login />} />
      <Route
        path="/admin/*"
        element={
          !user ? <Navigate to="/login" replace /> :
          profile?.role !== 'admin' ? <Navigate to="/shift" replace /> :
          <Admin />
        }
      />
      <Route
        path="/shift/*"
        element={
          !user ? <Navigate to="/login" replace /> :
          profile?.role !== 'employee' ? <Navigate to="/admin" replace /> :
          <Employee />
        }
      />
      <Route path="*" element={<Navigate to={user ? homeFor(profile?.role) : '/login'} replace />} />
    </Routes>
  );
}

function homeFor(role: string | undefined) {
  return role === 'admin' ? '/admin' : '/shift';
}
