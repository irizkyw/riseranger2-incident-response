import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SubmissionLogsProps {
  logs: any[];
  onFilterChange: (filter: string) => void;
}

export const SubmissionLogs: React.FC<SubmissionLogsProps> = ({ logs, onFilterChange }) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const handleFilter = (val: string) => {
    setActiveFilter(val);
    onFilterChange(val);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold font-outfit text-white">Real-Time Submission Audit Logs</h2>
        <div className="flex items-center gap-2 bg-black/60 p-1 rounded-lg border border-border">
          <Button
            variant={activeFilter === 'all' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => handleFilter('all')}
            className="h-8 text-xs"
          >
            All Attempts
          </Button>
          <Button
            variant={activeFilter === 'correct' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => handleFilter('correct')}
            className="h-8 text-xs text-cyber-green"
          >
            Correct Only
          </Button>
          <Button
            variant={activeFilter === 'wrong' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => handleFilter('wrong')}
            className="h-8 text-xs text-destructive"
          >
            Failed Only
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>User / IP Audit</TableHead>
            <TableHead>Challenge Attempted</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className={log.is_correct ? 'bg-cyber-green/5' : ''}>
              <TableCell>
                {log.is_correct ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit">
                    <CheckCircle2 className="h-3 w-3" /> Correct
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                    <XCircle className="h-3 w-3" /> Wrong Flag
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground flex items-center gap-1 pt-4">
                <Clock className="h-3 w-3" />
                {new Date(log.submitted_at).toLocaleTimeString()}
              </TableCell>
              <TableCell className="font-bold text-white">{log.team?.name || 'Unknown'}</TableCell>
              <TableCell>
                <div className="text-sm font-bold text-white">{log.user?.username}</div>
                <div className="text-xs text-muted-foreground font-mono">{log.user?.email}</div>
              </TableCell>
              <TableCell>
                <div className="font-bold text-white">{log.challenge?.title}</div>
                <span className="text-xs text-muted-foreground uppercase">{log.challenge?.category}</span>
              </TableCell>
              <TableCell className="text-right font-mono font-bold text-cyber-cyan">
                {log.is_correct ? `+${log.challenge?.points}` : '0'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
