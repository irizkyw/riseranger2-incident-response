import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Shield, Users, Trophy, LogOut, Menu, X, Rocket, ChevronRight, ShieldAlert, BarChart3, Settings, FileText, Tags, Activity, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    toast.success('Operator disconnected successfully.');
    navigate('/login');
  };

  const navItems = [
    { name: 'Arena Dashboard', path: '/dashboard', icon: Terminal, color: 'text-cyber-cyan', border: 'border-cyber-cyan' },
    { name: 'Scoreboard', path: '/scoreboard', icon: Rocket, color: 'text-yellow-400', border: 'border-yellow-400' },
    ...(!isAdmin ? [{ name: 'Team Command', path: '/team', icon: Users, color: 'text-cyber-purple', border: 'border-cyber-purple' }] : []),
  ];

  const adminItems = isAdmin ? [
    { name: 'Overview', path: '/hq', icon: BarChart3 },
    { name: 'Events', path: '/hq/events', icon: Settings },
    { name: 'Access Tokens', path: '/hq/tokens', icon: Key },
    { name: 'Challenges', path: '/hq/challenges', icon: Shield },
    { name: 'Teams', path: '/hq/teams', icon: Users },
    { name: 'Users', path: '/hq/users', icon: Users },
    { name: 'Categories', path: '/hq/categories', icon: Tags },
    { name: 'Submissions', path: '/hq/submissions', icon: Activity },
  ] : [];

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border px-4 flex items-center justify-between z-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight text-foreground text-lg">RISERANGER 2</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-foreground">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar Backdrop on Mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0 top-14' : '-translate-x-full lg:top-0'
          }`}
      >
        {/* Brand Header */}
        <div className="space-y-6">
          <Link to="/dashboard" className="hidden lg:flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-foreground text-lg flex items-center gap-1">
                RISERANGER 2
              </div>
              <div className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">INCIDENT RESPONSE CTF</div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(item as any).badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {isAdmin && (
            <div className="pt-4">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
                HQ COMMAND
              </div>
              <nav className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  // Exact match for /hq so it doesn't highlight when on /hq/events
                  const isActive = item.path === '/hq' ? location.pathname === '/hq' : location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                        isActive
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-border space-y-3">
          {user ? (
            <div className="flex items-center justify-between p-2 rounded-md border border-border">
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-foreground truncate">{user.username}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {user.role}
                  </div>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Logout</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to log out of the CTF Arena?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleLogout}>Log Out</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="w-full h-9 text-xs">Login</Button>
              </Link>
              <Link to="/register" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full h-9 text-xs">Register</Button>
              </Link>
            </div>
          )}
          <div className="text-center text-[10px] text-muted-foreground">
            RISERANGER 2 &copy; 2026
          </div>
        </div>
      </aside>
    </>
  );
};
