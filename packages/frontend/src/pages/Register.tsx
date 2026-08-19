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
      toast.error('Failed to load security Captcha. Please try again.');
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
      toast.error('Please fill in all registration fields!');
      return;
    }

    if (!captchaAnswer.trim()) {
      toast.error('Please enter the security Captcha code!');
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
      toast.success(res.data.message || 'Registration successful! Please log in to proceed.');
      navigate('/login');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        'Registration failed! Username or Email might already be registered.';
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
          <div className="mx-auto mb-1 flex justify-center">
            <img 
              src="/logo.webp" 
              alt="Rise The Ranger 2" 
              className="h-20 w-20 object-contain drop-shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:scale-105 transition-transform duration-300"
            />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight uppercase font-outfit bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            ENLIST OPERATIVE
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-mono">
            Register a new operative account to participate in Rise The Ranger 2
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
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verification Code (Captcha)
                </span>
                <span className="text-[10px] text-muted-foreground lowercase font-mono">4 characters</span>
              </label>

              <div className="flex items-center gap-2">
                {/* SVG Captcha Container */}
                <div
                  className="h-12 min-w-[160px] bg-muted/40 rounded-md border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner cursor-pointer"
                  onClick={fetchCaptcha}
                  title="Click to refresh code"
                  dangerouslySetInnerHTML={{ __html: captchaSvg || '<span class="text-xs text-muted-foreground">Loading...</span>' }}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  className="h-12 w-12 shrink-0 border-border hover:border-primary/50"
                  title="Reload Captcha code"
                >
                  <RefreshCw className={`h-4 w-4 ${captchaLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                </Button>

                <Input
                  placeholder="CODE"
                  value={captchaAnswer}
                  maxLength={6}
                  onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="h-12 font-mono text-center tracking-[0.25em] uppercase font-black text-base text-primary"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Type the 4 characters shown on the left (case-insensitive).
              </p>
            </div>

          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" variant="default" disabled={loading || !captchaAnswer.trim()} className="w-full h-10 gap-2 font-medium">
              {loading ? 'Enlisting Operative...' : 'Create Operative Account'} <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Login Here
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
