import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  
  // If not logged in, redirect to login page
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}