import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

export default function ProtectedRoute() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
