import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import api from '@/services/api';

interface TeamListProps {
  teams: any[];
  onRefresh: () => void;
}

export const TeamList: React.FC<TeamListProps> = ({ teams, onRefresh }) => {
  const handleToggleBan = async (teamId: string, currentStatus: boolean, teamName: string) => {
    const action = currentStatus ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} team "${teamName}"?`)) return;

    try {
      const res = await api.patch(`/admin/teams/${teamId}/ban`, { is_banned: !currentStatus });
      toast.success(res.data.message);
      onRefresh();
    } catch (err) {
      toast.error('Failed to update team ban status');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold font-outfit text-white">Registered Teams ({teams.length})</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Team Name</TableHead>
            <TableHead>Invite Code</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Submissions</TableHead>
            <TableHead className="text-right">Moderation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                {t.is_banned ? (
                  <Badge variant="destructive" className="flex items-center gap-1 w-fit animate-pulse">
                    <ShieldAlert className="h-3 w-3" /> BANNED
                  </Badge>
                ) : (
                  <Badge variant="green" className="flex items-center gap-1 w-fit">
                    <ShieldCheck className="h-3 w-3" /> Active
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{t.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-white text-base">{t.name}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono tracking-widest text-muted-foreground">{t.invite_code}</TableCell>
              <TableCell className="text-right font-mono">{t._count?.members || 0}</TableCell>
              <TableCell className="text-right font-mono font-black text-cyber-cyan text-lg">{t.score} PTS</TableCell>
              <TableCell className="text-right font-mono">{t._count?.submissions || 0}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant={t.is_banned ? "default" : "destructive"}
                  size="sm"
                  onClick={() => handleToggleBan(t.id, t.is_banned, t.name)}
                  className="h-8 px-3 text-xs"
                >
                  {t.is_banned ? 'Unban Team' : 'Ban / Disqualify'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
