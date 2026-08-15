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

  if (loading) {
    return <div className="container mx-auto p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Admin Command Center...</div>;
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
