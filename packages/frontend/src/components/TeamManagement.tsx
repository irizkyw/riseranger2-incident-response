import React, { useState } from 'react';
import { Users, UserPlus, LogOut, UserX, Crown, ShieldAlert, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

  // Confirmation Modals State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; username: string } | null>(null);

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
      const res = await api.post('/teams/join', { invite_code: inviteCode.trim().toUpperCase() });
      toast.success(res.data.message);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    setLoading(true);
    try {
      const res = await api.post('/teams/leave');
      toast.success(res.data.message || 'Successfully left team');
      setLeaveModalOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to leave team');
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = async () => {
    if (!kickTarget) return;
    setLoading(true);
    try {
      const res = await api.delete(`/teams/kick/${kickTarget.id}`);
      toast.success(res.data.message || `Operative @${kickTarget.username} removed from team`);
      setKickTarget(null);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to kick member');
    } finally {
      setLoading(false);
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
        <Card className="border-primary/40 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-outfit">
              <Users className="h-5 w-5" /> Create New Squad
            </CardTitle>
            <CardDescription>
              Create a team and automatically become the team leader. You can invite teammates using an invite code.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateTeam}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Team Name</label>
                <Input
                  placeholder="e.g., Cyber_Samurais"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading || !teamName.trim()} className="w-full">
                {loading ? 'Creating...' : 'Create Team'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-outfit">
              <UserPlus className="h-5 w-5 text-primary" /> Join Existing Squad
            </CardTitle>
            <CardDescription>
              Have an invite code from your team leader or pre-created squad? Enter it below to join the squad.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoinTeam}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Squad Invite Code</label>
                <Input
                  placeholder="e.g., 8F3A2C1B"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="font-mono tracking-widest uppercase"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="secondary" disabled={loading || !inviteCode.trim()} className="w-full">
                {loading ? 'Joining...' : 'Join Squad'}
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
      <Card className="border-border bg-card shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black font-outfit text-foreground tracking-wide">{team.name}</h2>
              <Badge variant="outline" className="text-xs px-3 py-1 bg-primary/10 text-primary border-primary/30 font-mono">
                Rank #{team.rank || 'N/A'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              Total Score: <span className="text-primary font-bold text-lg">{team.score} PTS</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border border-border">
              <span className="text-xs text-muted-foreground font-mono">Invite Code:</span>
              <span className="font-mono font-bold text-foreground tracking-widest">{team.invite_code}</span>
              <Button variant="ghost" size="icon" onClick={copyInviteCode} className="h-7 w-7 text-primary hover:bg-primary/10">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setLeaveModalOpen(true)} 
              disabled={loading} 
              className="flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" /> Leave Team
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <h3 className="text-lg font-bold text-foreground font-outfit mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Squad Operatives ({team.members?.length || 0})
          </h3>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs uppercase">Member</TableHead>
                  <TableHead className="text-xs uppercase">Role</TableHead>
                  <TableHead className="text-xs uppercase">Joined At</TableHead>
                  {isLeader && <TableHead className="text-xs uppercase text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members?.map((member: any) => {
                  const memberIsLeader = team.leader_id === member.user.id;
                  return (
                    <TableRow key={member.id} className="border-border hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {member.user.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground text-sm">@{member.user.username}</span>
                            {member.user.id === user?.id && <span className="ml-2 text-xs text-primary font-medium">(You)</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {memberIsLeader ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit text-[10px] font-semibold">
                            <Crown className="h-3 w-3 text-amber-400" /> Leader
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Operative</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </TableCell>
                      {isLeader && (
                        <TableCell className="text-right">
                          {!memberIsLeader && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setKickTarget({ id: member.user.id, username: member.user.username })}
                              className="h-7 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
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
          </div>
        </CardContent>
      </Card>

      {/* LEAVE TEAM CONFIRMATION MODAL */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Leave Squad
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to leave team <strong>"{team?.name}"</strong>? If you are the leader and there are remaining members, leadership will be transferred.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={loading} onClick={handleLeaveTeam}>
              {loading ? 'Leaving...' : 'Confirm Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KICK MEMBER CONFIRMATION MODAL */}
      <Dialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Kick Operative
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove operative <strong>@{kickTarget?.username}</strong> from your squad?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={loading} onClick={handleKickMember}>
              {loading ? 'Removing...' : 'Kick Operative'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
