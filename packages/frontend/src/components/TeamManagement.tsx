import React, { useState } from 'react';
import { Users, UserPlus, LogOut, UserX, Crown, ShieldAlert, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import api from '@/services/api';

interface TeamManagementProps {
  user: any;
  team: any;
  onUpdate: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ user, team, onUpdate }) => {
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/teams/create', { name: teamName.trim() });
      toast.success(res.data.message);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/teams/join', { invite_code: inviteCode.trim() });
      toast.success(res.data.message);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave your team?')) return;
    setLoading(true);
    try {
      const res = await api.post('/teams/leave');
      toast.success(res.data.message);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to leave team');
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = async (targetUserId: string, targetUsername: string) => {
    if (!confirm(`Are you sure you want to kick ${targetUsername} from the team?`)) return;
    try {
      const res = await api.delete(`/teams/kick/${targetUserId}`);
      toast.success(res.data.message);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to kick member');
    }
  };

  const copyInviteCode = () => {
    if (team?.invite_code) {
      navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      toast.success('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!team) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="border-cyber-cyan/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyber-cyan">
              <Users className="h-5 w-5" /> Create New Team
            </CardTitle>
            <CardDescription>
              Create a team and automatically become the team leader. You can invite friends using an invite code.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateTeam}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Team Name</label>
                <Input
                  placeholder="e.g., Cyber_Samurais"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="cyber" disabled={loading || !teamName.trim()} className="w-full">
                Create Team
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="border-cyber-purple/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyber-purple">
              <UserPlus className="h-5 w-5" /> Join Existing Team
            </CardTitle>
            <CardDescription>
              Have an invite code from your team leader? Enter it below to join their squad.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoinTeam}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyber-purple uppercase font-outfit">Invite Code</label>
                <Input
                  placeholder="e.g., 8F3A2C1B"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="uppercase"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="default" disabled={loading || !inviteCode.trim()} className="w-full bg-cyber-purple hover:bg-cyber-purple/90">
                Join Team
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  const isLeader = team.leader_id === user?.id;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="border-cyber-cyan/50 bg-black/60 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black font-outfit text-white tracking-wide">{team.name}</h2>
              <Badge variant="cyber" className="text-sm px-3 py-1">Rank #{team.rank || 'N/A'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">Total Score: <span className="text-cyber-cyan font-bold text-lg">{team.score} PTS</span></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-md border border-border/60">
              <span className="text-xs text-muted-foreground font-mono">Invite Code:</span>
              <span className="font-mono font-bold text-white tracking-widest">{team.invite_code}</span>
              <Button variant="ghost" size="icon" onClick={copyInviteCode} className="h-7 w-7 text-cyber-cyan hover:bg-cyber-cyan/20">
                {copied ? <Check className="h-3.5 w-3.5 text-cyber-green" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLeaveTeam} disabled={loading} className="flex items-center gap-1.5">
              <LogOut className="h-4 w-4" /> Leave Team
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <h3 className="text-lg font-bold text-white font-outfit mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyber-cyan" /> Team Members ({team.members?.length || 0})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined At</TableHead>
                {isLeader && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members?.map((member: any) => {
                const memberIsLeader = team.leader_id === member.user.id;
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{member.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-white">{member.user.username}</span>
                          {member.user.id === user?.id && <span className="ml-2 text-xs text-cyber-cyan">(You)</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {memberIsLeader ? (
                        <Badge variant="green" className="flex items-center gap-1 w-fit">
                          <Crown className="h-3 w-3 text-yellow-400" /> Leader
                        </Badge>
                      ) : (
                        <Badge variant="outline">Member</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    {isLeader && (
                      <TableCell className="text-right">
                        {!memberIsLeader && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleKickMember(member.user.id, member.user.username)}
                            className="h-8 px-2.5 text-xs"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" /> Kick
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
