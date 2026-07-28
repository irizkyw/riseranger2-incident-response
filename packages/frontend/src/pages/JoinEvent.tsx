import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

export const JoinEvent: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please enter an event token');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/events/join', { join_token: token });
      
      // Update local storage user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.event_id = res.data.event_id;
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast.success(res.data.message);
      window.location.href = '/dashboard'; // Force reload to apply changes everywhere
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to join event. Invalid token.');
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
              <Key className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">JOIN EVENT</CardTitle>
          <CardDescription>
            Enter the token provided by the administrator to access your CTF event.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                Event Token
              </label>
              <Input
                placeholder="e.g. MAHA2026"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" variant="default" disabled={loading} className="w-full">
              {loading ? 'Joining...' : 'Join Event'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
