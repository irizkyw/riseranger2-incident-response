import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Lock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  useEffect(() => {
    const reason = sessionStorage.getItem('logout_reason');
    if (reason) {
      setLogoutReason(reason);
      sessionStorage.removeItem('logout_reason');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      toast.error('Please fill in all fields!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { usernameOrEmail, password });
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      const userRole = (user?.role || '').toUpperCase();
      const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(userRole);

      toast.success(`Welcome back, ${user.username}!`);
      if (isStaff) {
        navigate('/hq');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed! Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-1 flex justify-center">
            <img 
              src="/logo.webp" 
              alt="Rise The Ranger 2" 
              className="h-20 w-20 object-contain drop-shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:scale-105 transition-transform duration-300"
            />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight font-outfit uppercase bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            RISE THE RANGER 2
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-mono">
            Incident Response & Capture The Flag Operator Arena
          </CardDescription>

          {logoutReason && (
            <div className="mt-3 p-3 text-left text-xs font-mono text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-lg flex items-start gap-2.5 shadow-lg shadow-amber-950/20">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-bold uppercase tracking-wider text-amber-400">Anti-Cheat Enforcement</div>
                <div className="text-slate-300 mt-0.5">{logoutReason}</div>
              </div>
            </div>
          )}
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <User className="h-4 w-4" /> Username or Email
              </label>
              <Input
                placeholder="hacker@operator.ctf"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <Lock className="h-4 w-4" /> Password
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" variant="default" disabled={loading} className="w-full">
              {loading ? 'Authenticating...' : 'Engage Systems'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an operator account?{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Register Here
              </Link>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <Link to="/scoreboard" className="font-semibold text-primary hover:underline">
                View Public Scoreboard
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
