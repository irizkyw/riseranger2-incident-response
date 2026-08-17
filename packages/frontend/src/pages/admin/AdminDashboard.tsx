import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { AdminStats } from '@/components/admin/AdminStats';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminDashboard: React.FC = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStatsData(res.data);
    } catch (err: any) {
      toast.error('Failed to load admin stats! Check if you have Admin access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !statsData) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-border" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted/50 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-card border border-border p-5 space-y-3">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-8 w-20 bg-muted/80 rounded" />
              <div className="h-3 w-36 bg-muted/40 rounded" />
            </div>
          ))}
        </div>

        <div className="h-72 rounded-xl bg-card border border-border flex items-center justify-center animate-pulse">
          <div className="text-center space-y-2">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p className="text-muted-foreground font-mono text-sm">Loading Admin Command Center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">OVERVIEW STATS</h1>
          <p className="text-sm text-muted-foreground">General platform statistics and challenge solve rates.</p>
        </div>
      </div>

      <div className="mt-6">
        <AdminStats data={statsData} onRefresh={fetchStats} loading={loading} />
      </div>
    </div>
  );
};
