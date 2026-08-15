import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Lock, User, Mail, ArrowRight, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/services/api';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await api.get('/auth/captcha');
      setCaptchaId(res.data.id);
      setCaptchaSvg(res.data.svg);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to load captcha:', err);
      toast.error('Gagal memuat Captcha keamanan. Silakan coba lagi.');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast.error('Harap isi semua kolom pendaftaran!');
      return;
    }

    if (!captchaAnswer.trim()) {
      toast.error('Harap masukkan kode Captcha keamanan!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password,
        captcha_id: captchaId,
        captcha_answer: captchaAnswer.trim()
      });
      toast.success(res.data.message || 'Registrasi berhasil! Silakan login untuk melanjutkan.');
      navigate('/login');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        'Registrasi gagal! Username/Email mungkin sudah terdaftar.';
      toast.error(errorMsg);
      // Reload captcha on failure
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Terminal className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight uppercase font-outfit text-foreground">
            ENLIST OPERATIVE
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Daftarkan profil akun peserta baru untuk berpartisipasi dalam CTF arena.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Username
              </label>
              <Input
                placeholder="zero_cool"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Address
              </label>
              <Input
                type="email"
                placeholder="zerocool@hack.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> Password
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* CAPTCHA SECTION */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Kode Verifikasi (Captcha)
                </span>
                <span className="text-[10px] text-muted-foreground lowercase font-mono">4 karakter</span>
              </label>

              <div className="flex items-center gap-2">
                {/* SVG Captcha Container */}
                <div
                  className="h-12 min-w-[160px] bg-muted/40 rounded-md border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner cursor-pointer"
                  onClick={fetchCaptcha}
                  title="Klik untuk ganti kode"
                  dangerouslySetInnerHTML={{ __html: captchaSvg || '<span class="text-xs text-muted-foreground">Memuat...</span>' }}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  className="h-12 w-12 shrink-0 border-border hover:border-primary/50"
                  title="Muat ulang kode Captcha"
                >
                  <RefreshCw className={`h-4 w-4 ${captchaLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                </Button>

                <Input
                  placeholder="KODE"
                  value={captchaAnswer}
                  maxLength={6}
                  onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="h-12 font-mono text-center tracking-[0.25em] uppercase font-black text-base text-primary"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ketik 4 karakter yang tampil di samping (huruf besar/kecil sama saja).
              </p>
            </div>

          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" variant="default" disabled={loading || !captchaAnswer.trim()} className="w-full h-10 gap-2 font-medium">
              {loading ? 'Mendaftarkan Akun...' : 'Buat Akun Peserta'} <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Sudah memiliki akun?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Login di Sini
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
