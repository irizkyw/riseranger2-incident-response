import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Trophy, Users, Terminal, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import api from '@/services/api';
import socketService from '@/services/socket';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
    };
    fetchUser();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    socketService.disconnect();
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border/40 bg-black/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-purple p-0.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform">
            <div className="flex h-full w-full items-center justify-center rounded-md bg-black">
              <Terminal className="h-5 w-5 text-cyber-cyan animate-pulse" />
            </div>
          </div>
          <span className="font-outfit text-lg font-black tracking-wider text-white">
            ANTI<span className="text-cyber-cyan">GRAVITY</span> <span className="text-xs bg-cyber-purple/20 text-cyber-purple px-1.5 py-0.5 rounded border border-cyber-purple/40">CTF</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/dashboard" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-cyber-cyan ${location.pathname === '/dashboard' ? 'text-cyber-cyan' : 'text-muted-foreground'}`}>
            <Shield className="h-4 w-4" /> Challenges
          </Link>
          <Link to="/scoreboard" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-cyber-cyan ${location.pathname === '/scoreboard' ? 'text-cyber-cyan' : 'text-muted-foreground'}`}>
            <Trophy className="h-4 w-4 text-yellow-400" /> Scoreboard
          </Link>
          <Link to="/team" className={`flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-cyber-cyan ${location.pathname === '/team' ? 'text-cyber-cyan' : 'text-muted-foreground'}`}>
            <Users className="h-4 w-4" /> My Team
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className={`flex items-center gap-1.5 text-sm font-semibold text-cyber-pink hover:opacity-80 transition-opacity ${location.pathname.startsWith('/admin') ? 'underline underline-offset-4' : ''}`}>
              <ShieldAlert className="h-4 w-4" /> Admin Panel
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.team && (
                <Badge variant="cyber" className="hidden md:inline-flex">
                  Team: {user.team.name} ({user.team.score} PTS)
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold text-white hidden sm:inline">{user.username}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="cyber" size="sm">Register</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
