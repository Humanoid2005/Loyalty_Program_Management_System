import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/" replace />;
  }

  // If user is logged in but trying to access login page
  if (!requireAuth && user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  // If specific roles are required, check if user has one of them
  if (allowedRoles.length > 0 && user) {
    const hasAccess = allowedRoles.includes(user.role);
    if (!hasAccess) {
      // Redirect to user's default role page if they don't have access
      return <Navigate to={`/${user.role}`} replace />;
    }
  }

  // All checks passed, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
