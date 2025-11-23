import React from 'react';
import AdminDashboard from '../components/admin/AdminDashboard';
import useAuth from '../hooks/useAuth';
import { BACKEND_URL } from '../config/config';

const AdminPage: React.FC = () => {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = `${BACKEND_URL}/auth/logout`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return <AdminDashboard user={user} onLogout={handleLogout} />;
};

export default AdminPage;
