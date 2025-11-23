import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import VolunteersPage from './pages/VolunteersPage';
import ParticipantPage from './pages/ParticipantPage';
import LeaderboardPage from './pages/LeaderboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route - only accessible when not logged in */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute requireAuth={false}>
              <HomePage />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Route - only for admin role */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Volunteer Route - for volunteer and admin roles */}
        <Route 
          path="/volunteer" 
          element={
            <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
              <VolunteersPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Participant Route - accessible to all authenticated users */}
        <Route 
          path="/participant" 
          element={
            <ProtectedRoute>
              <ParticipantPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Leaderboard Route - accessible to all authenticated users */}
        <Route 
          path="/leaderboard" 
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all Route */}
        <Route 
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;