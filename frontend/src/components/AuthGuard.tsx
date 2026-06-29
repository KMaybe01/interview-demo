import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores';

export default function AuthGuard() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
