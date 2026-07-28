import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Lock, User, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      toast.error('Please fill in all fields!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password
      });
      toast.success('Registration successful! Please login to continue.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed! Username/Email might be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <div className="flex h-full w-full items-center justify-center rounded-[10px]">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">ENLIST SQUAD</CardTitle>
          <CardDescription>
            Register a new operator profile.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                <User className="h-4 w-4" /> Username
              </label>
              <Input
                placeholder="zero_cool"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email Address
              </label>
              <Input
                type="email"
                placeholder="zerocool@hack.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Registering...' : 'Initialize Account'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already enlisted?{' '}
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
