import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Key, ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

export const JoinEvent: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Silakan masukkan token akses event Anda');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/events/join', { join_token: token.trim() });
      
      // Update local storage user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.event_id = res.data.event_id;
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast.success(res.data.message || 'Akses berhasil diverifikasi!');
      window.location.href = '/dashboard'; // Force reload to apply changes everywhere
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memverifikasi token. Pastikan token benar dan belum terpakai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center px-4 py-8 relative">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/dashboard')} 
          className="gap-2 text-muted-foreground hover:text-foreground text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard</span>
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout} 
          className="gap-1.5 text-muted-foreground hover:text-destructive text-xs"
          title="Keluar dari akun saat ini"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log Out</span>
        </Button>
      </div>

      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto mb-1 flex justify-center">
            <img 
              src="/logo.webp" 
              alt="Rise The Ranger 2" 
              className="h-16 w-16 object-contain drop-shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 transition-transform"
            />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight uppercase font-outfit bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            VERIFIKASI ACCESS TOKEN
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-mono">
            Masukkan tiket unik yang diberikan oleh panitia Rise The Ranger 2 untuk membuka arena kompetisi.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Access / Event Token</span>
                <span className="text-[10px] text-primary font-mono lowercase">single-use key</span>
              </label>
              <Input
                placeholder="e.g. RR26-X8F9-A1B2"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                disabled={loading}
                className="font-mono text-center tracking-widest text-base font-bold uppercase h-11"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Setiap token unik hanya dapat diklaim 1 kali oleh satu peserta/tim.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" variant="default" disabled={loading || !token.trim()} className="w-full h-10 gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              {loading ? 'Memverifikasi Token...' : 'Klaim Akses & Buka Arena'}
            </Button>

            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')} 
              className="w-full h-9 text-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Dashboard
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
