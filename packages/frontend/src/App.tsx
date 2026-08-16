import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { JoinEvent } from '@/pages/JoinEvent';
import { Dashboard } from '@/pages/Dashboard';
import { ChallengeDetail } from '@/pages/ChallengeDetail';
import { TeamPage } from '@/pages/TeamPage';
import { Scoreboard } from '@/pages/Scoreboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminEvents } from '@/pages/admin/AdminEvents';
import { AdminChallenges } from '@/pages/admin/AdminChallenges';
import { AdminTeams } from '@/pages/admin/AdminTeams';
import { AdminSubmissions } from '@/pages/admin/AdminSubmissions';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminCategories } from '@/pages/admin/AdminCategories';
import { AdminTokens } from '@/pages/admin/AdminTokens';
import { AdminWriteups } from '@/pages/admin/AdminWriteups';
import { AdminLiveActivity } from '@/pages/admin/AdminLiveActivity';
import { AdminRoles } from '@/pages/admin/AdminRoles';
import { Writeup } from '@/pages/Writeup';
import { ProfilePage } from '@/pages/ProfilePage';

const ProtectedRoute = ({ children, requireAdmin = false, requireParticipant = false }: { children: React.ReactNode; requireAdmin?: boolean; requireParticipant?: boolean }) => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireParticipant && user?.role === 'ADMIN') {
    return <Navigate to="/hq" replace />;
  }

  const location = useLocation();
  if (requireParticipant && user?.role === 'PARTICIPANT' && !user?.event_id && location.pathname !== '/join') {
    return <Navigate to="/join" replace />;
  }

  return <>{children}</>;
};

import { useLocation } from 'react-router-dom';

const AppContent: React.FC = () => {
  const location = useLocation();
  const hideSidebarRoutes = ['/login', '/register', '/scoreboard', '/join'];
  const hideSidebar = hideSidebarRoutes.includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!hideSidebar && <Sidebar />}
      <main className={`flex-1 ${!hideSidebar ? 'lg:pl-64 pt-14 lg:pt-0' : ''} min-h-screen flex flex-col overflow-x-hidden`}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<ProtectedRoute requireParticipant><JoinEvent /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/challenge/:id" element={<ProtectedRoute requireParticipant><ChallengeDetail /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute requireParticipant><TeamPage /></ProtectedRoute>} />
          <Route path="/writeup" element={<ProtectedRoute requireParticipant><Writeup /></ProtectedRoute>} />
          <Route path="/scoreboard" element={<Scoreboard />} />

          {/* Admin Routes (HQ) */}
          <Route path="/hq" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/hq/live-activity" element={<ProtectedRoute requireAdmin><AdminLiveActivity /></ProtectedRoute>} />
          <Route path="/hq/events" element={<ProtectedRoute requireAdmin><AdminEvents /></ProtectedRoute>} />
          <Route path="/hq/tokens" element={<ProtectedRoute requireAdmin><AdminTokens /></ProtectedRoute>} />
          <Route path="/hq/challenges" element={<ProtectedRoute requireAdmin><AdminChallenges /></ProtectedRoute>} />
          <Route path="/hq/teams" element={<ProtectedRoute requireAdmin><AdminTeams /></ProtectedRoute>} />
          <Route path="/hq/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/hq/roles" element={<ProtectedRoute requireAdmin><AdminRoles /></ProtectedRoute>} />
          <Route path="/hq/writeups" element={<ProtectedRoute requireAdmin><AdminWriteups /></ProtectedRoute>} />
          <Route path="/hq/categories" element={<ProtectedRoute requireAdmin><AdminCategories /></ProtectedRoute>} />
          <Route path="/hq/submissions" element={<ProtectedRoute requireAdmin><AdminSubmissions /></ProtectedRoute>} />
          
          <Route path="/admin" element={<Navigate to="/hq" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <Toaster position="top-right" expand={false} richColors closeButton />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
