import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Shield, Users, Trophy, LogOut, Menu, X, Rocket, ChevronRight, ShieldAlert, BarChart3, Settings, FileText, Tags, Activity, Key, UserCog, Radio, ShieldCheck } from 'lucide-react';
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
import { ProfileModal } from '@/components/ProfileModal';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  useEffect(() => {
    const handleStorage = () => {
      const userStr = localStorage.getItem('user');
      setCurrentUser(userStr ? JSON.parse(userStr) : null);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('user-profile-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-profile-updated', handleStorage);
    };
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

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
    ...(!isAdmin ? [
      { name: 'Team Command', path: '/team', icon: Users, color: 'text-cyber-purple', border: 'border-cyber-purple' },
      { name: 'Writeup / Report', path: '/writeup', icon: FileText, color: 'text-emerald-400', border: 'border-emerald-400' }
    ] : []),
  ];

  const adminSections = isAdmin ? [
    {
      title: 'Radar & Monitoring',
      items: [
        { name: 'Overview', path: '/hq', icon: BarChart3 },
        { name: 'Live Radar & Timers', path: '/hq/live-activity', icon: Radio, badge: 'LIVE' },
        { name: 'Submissions Stream', path: '/hq/submissions', icon: Activity },
      ]
    },
    {
      title: 'Arena & Competition',
      items: [
        { name: 'Events Arena', path: '/hq/events', icon: Settings },
        { name: 'Access Tokens', path: '/hq/tokens', icon: Key },
      ]
    },
    {
      title: 'Challenges & Content',
      items: [
        { name: 'Challenges', path: '/hq/challenges', icon: Shield },
        { name: 'Categories', path: '/hq/categories', icon: Tags },
        { name: 'Writeup Evaluation', path: '/hq/writeups', icon: FileText },
      ]
    },
    {
      title: 'Squads & Operatives',
      items: [
        { name: 'Squads / Teams', path: '/hq/teams', icon: Users },
        { name: 'Operatives / Users', path: '/hq/users', icon: UserCog },
        { name: 'Roles & Access', path: '/hq/roles', icon: ShieldCheck },
      ]
    }
  ] : [];

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border px-4 flex items-center justify-between z-50">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img 
            src="/logo.webp" 
            alt="Rise The Ranger 2" 
            className="h-8 w-8 object-contain rounded-lg shrink-0 shadow-md shadow-cyan-500/20" 
          />
          <span className="font-bold tracking-tight text-foreground text-base uppercase font-outfit">RISE THE RANGER 2</span>
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 top-14' : '-translate-x-full lg:top-0'
        }`}
      >
        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-5">
          {/* Brand Header */}
          <Link to="/dashboard" className="hidden lg:flex items-center gap-3 px-2 py-1 group">
            <img 
              src="/logo.webp" 
              alt="Rise The Ranger 2" 
              className="h-10 w-10 object-contain rounded-xl shrink-0 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform duration-300" 
            />
            <div>
              <div className="font-extrabold tracking-tight text-foreground text-sm flex items-center gap-1 font-outfit uppercase bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                RISE THE RANGER 2
              </div>
              <div className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase font-mono">INCIDENT RESPONSE ARENA</div>
            </div>
          </Link>

          {/* Main Public / Participant Nav Links */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">
              CTF ARENA
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
                      isActive
                        ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    {(item as any).badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin HQ Command with Categorized Sub-Sections */}
          {isAdmin && (
            <div className="space-y-4 pt-1 border-t border-border/60">
              <div className="px-3 pt-2 text-[11px] font-black uppercase tracking-wider text-primary font-outfit flex items-center justify-between">
                <span>HQ COMMAND PANEL</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono bg-primary/10 text-primary border-primary/30">
                  ADMIN
                </Badge>
              </div>

              {adminSections.map((sec, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5 pt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                    <span>{sec.title}</span>
                  </div>

                  <nav className="space-y-1">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.path === '/hq' ? location.pathname === '/hq' : location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={`group flex items-center justify-between px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
                            isActive
                              ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary shadow-sm'
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground border-l-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${item.path === '/hq/live-activity' ? 'text-cyan-400 animate-pulse' : ''}`} />
                            <span>{item.name}</span>
                          </div>
                          {(item as any).badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 font-mono">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                              {(item as any).badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-border space-y-3">
          {currentUser ? (
            <div
              onClick={() => setIsProfileOpen(true)}
              className="group flex items-center justify-between p-2 rounded-md border border-border/80 hover:border-primary/50 hover:bg-accent/40 cursor-pointer transition-all duration-200"
              title="Klik untuk membuka Profil & Pengaturan Akun"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border group-hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                    {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'OP'}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden text-left">
                  <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1">
                    <span>{currentUser.username}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <span>{currentUser.role}</span>
                    <span className="text-[9px] text-muted-foreground/60">• Profil</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                  title="Pengaturan Profil"
                >
                  <UserCog className="h-3.5 w-3.5" />
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-destructive shrink-0 h-7 w-7"
                      title="Keluar / Logout"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
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

      {/* Operator Profile & Settings Modal */}
      <ProfileModal
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />
    </>
  );
};
