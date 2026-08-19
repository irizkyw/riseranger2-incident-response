import React, { useEffect } from 'react';
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
import { AdminFirstBloods } from '@/pages/admin/AdminFirstBloods';
import { AdminAntiCheatLogs } from '@/pages/admin/AdminAntiCheatLogs';

const ProtectedRoute = ({ children, requireAdmin = false, requireParticipant = false }: { children: React.ReactNode; requireAdmin?: boolean; requireParticipant?: boolean }) => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = (user?.role || 'PARTICIPANT').toUpperCase();
  const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(userRole);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireParticipant && !isStaff && !user?.event_id && location.pathname !== '/join') {
    return <Navigate to="/join" replace />;
  }

  if (requireParticipant && isStaff) {
    if (location.pathname === '/writeup') {
      return <Navigate to="/hq/writeups" replace />;
    }
    if (location.pathname === '/team') {
      return <Navigate to="/hq/teams" replace />;
    }
  }

  return <>{children}</>;
};

import { useLocation } from 'react-router-dom';
import socketService from '@/services/socket';
import PixelBlast from '@/components/ui/PixelBlast';

const AppContent: React.FC = () => {
  const location = useLocation();
  const hideSidebarRoutes = ['/login', '/register', '/scoreboard', '/join'];
  const hideSidebar = hideSidebarRoutes.includes(location.pathname);
  const isScoreboard = location.pathname === '/scoreboard';

  // Global real-time socket lifecycle & force-logout listener
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      socketService.connect();
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background text-foreground relative">
      {!isScoreboard && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#1c74b3"
            patternScale={8}
            patternDensity={1}
            pixelSizeJitter={0.45}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={3}
            edgeFade={0.05}
            transparent
          />
        </div>
      )}
      {!hideSidebar && <Sidebar />}
      <main className={`flex-1 ${!hideSidebar ? 'lg:pl-64 pt-14 lg:pt-0' : ''} min-h-screen flex flex-col overflow-x-hidden relative z-10`}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          {/* Registration is locked: redirect any direct attempt to /login */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/join" element={<ProtectedRoute requireParticipant><JoinEvent /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/challenge/:id" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
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
          <Route path="/hq/first-bloods" element={<ProtectedRoute requireAdmin><AdminFirstBloods /></ProtectedRoute>} />
          <Route path="/hq/anti-cheat" element={<ProtectedRoute requireAdmin><AdminAntiCheatLogs /></ProtectedRoute>} />

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
