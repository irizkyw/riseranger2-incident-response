import React, { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { SubmissionLogs } from '@/components/admin/SubmissionLogs';
import { toast } from 'sonner';
import api from '@/services/api';
import { Input } from '@/components/ui/input';

export const AdminSubmissions: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLogs = async (statusFilter: string = 'all', searchQuery: string = '') => {
    let url = `/admin/logs?limit=50&search=${encodeURIComponent(searchQuery)}`;
    if (statusFilter === 'correct') url += '&is_correct=true';
    if (statusFilter === 'wrong') url += '&is_correct=false';
    try {
      const res = await api.get(url);
      setLogs(res.data);
    } catch (err) {
      toast.error('Failed to filter logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Audit Logs...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit">Submission Logs</h1>
            <p className="text-muted-foreground mt-1">Real-time audit of flag submissions across all events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search team or challenge..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchLogs(filter, e.target.value);
            }}
            className="w-64"
          />
          <select 
            value={filter} 
            onChange={(e) => {
              setFilter(e.target.value);
              fetchLogs(e.target.value, search);
            }}
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all" className="bg-background text-foreground">All Submissions</option>
            <option value="correct" className="bg-background text-foreground">Correct Only</option>
            <option value="wrong" className="bg-background text-foreground">Wrong Only</option>
          </select>
        </div>
      </div>
      
      <SubmissionLogs logs={logs} onFilterChange={fetchLogs} />
    </div>
  );
};
