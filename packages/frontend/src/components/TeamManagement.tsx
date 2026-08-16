import React, { useState, useEffect } from 'react';
import { Users, UserPlus, LogOut, UserX, Crown, ShieldAlert, Copy, Check, ShieldCheck, AlertCircle, Key, History, Trophy, Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
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

  // Squad History State
  const [teamHistory, setTeamHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Confirmation Modals State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; username: string } | null>(null);

  const isEventStarted = user?.role !== 'ADMIN' && Boolean(
    (team?.event?.start_time && new Date() >= new Date(team.event.start_time)) ||
    (user?.event?.start_time && new Date() >= new Date(user.event.start_time))
  );


  const fetchTeamHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/teams/history/my');
      setTeamHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load squad history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamHistory();
  }, [team]);


  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/teams/create', { name: teamName.trim() });
      toast.success(res.data.message);
      setTeamName('');
      onUpdate();
      await fetchTeamHistory();
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
      setInviteCode('');
      onUpdate();
      await fetchTeamHistory();
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
      await fetchTeamHistory();
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

  const renderTeamHistorySection = () => (
    <Card className="border-border bg-card shadow-sm mt-8">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold font-outfit uppercase flex items-center gap-2">
                Riwayat Squad & Tim (Squad History)
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-mono">
                  {teamHistory.length} Squad
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar tim / squad yang pernah Anda buat (sebagai Leader) atau pernah Anda ikuti di arena kompetisi.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {historyLoading ? (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground animate-pulse">
            Memuat riwayat squad...
          </div>
        ) : teamHistory.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground space-y-2">
            <Users className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-xs">Belum ada riwayat squad yang pernah dibuat atau diikuti.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs uppercase">Nama Squad</TableHead>
                  <TableHead className="text-xs uppercase">Peran / Status</TableHead>
                  <TableHead className="text-xs uppercase">Arena Event</TableHead>
                  <TableHead className="text-xs uppercase">Kode Invite</TableHead>
                  <TableHead className="text-xs uppercase">Anggota</TableHead>
                  <TableHead className="text-xs uppercase">Skor Flag</TableHead>
                  <TableHead className="text-xs uppercase text-right">Tanggal Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamHistory.map((hist) => {
                  const isCurrent = team?.id === hist.id;
                  return (
                    <TableRow key={hist.id} className="border-border hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: hist.color || '#00F0FF' }} />
                          <span className="font-bold text-sm text-foreground">{hist.name}</span>
                          {isCurrent ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[9px] uppercase">
                              Aktif Sekarang
                            </Badge>
                          ) : hist.action === 'DISBANDED' ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[9px] uppercase">
                              Dibubarkan
                            </Badge>
                          ) : hist.action === 'LEFT' ? (
                            <Badge variant="secondary" className="text-[9px] uppercase">
                              Keluar Tim
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hist.is_my_creation || hist.role === 'LEADER' ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1">
                            <Crown className="h-3 w-3" /> Pembuat / Leader
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Operative Anggota
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {hist.event?.name || 'Default Arena'}
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-0.5 rounded bg-muted/60 font-mono text-xs font-bold text-primary">
                          {hist.invite_code}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {hist.members_count > 0 ? `${hist.members_count} Anggota` : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-primary">
                        {hist.score} pts
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono text-right">
                        {new Date(hist.created_at).toLocaleString()}
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!user?.event_id) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="max-w-md mx-auto p-8 rounded-2xl border border-primary/40 bg-card shadow-xl text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Key className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-foreground font-outfit uppercase">Akses Squad Terkunci</h3>
            <p className="text-xs text-muted-foreground">
              Akun Anda belum memiliki tiket Access Token aktif atau token Anda telah <strong>di-unlink oleh Administrator</strong>. Silakan masukkan Access Token terlebih dahulu di menu Arena/Dashboard untuk mengaktifkan fitur Squad.
            </p>
          </div>
          <Link to="/dashboard" className="block pt-2">
            <Button className="gap-2 w-full font-semibold">
              <Key className="h-4 w-4" /> Masukkan Access Token di Arena
            </Button>
          </Link>
        </div>

        {/* Show history if any */}
        {teamHistory.length > 0 && renderTeamHistorySection()}
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

        {/* Squad History Section */}
        {renderTeamHistorySection()}
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
              variant={isEventStarted ? 'outline' : 'destructive'} 
              size="sm" 
              onClick={() => {
                if (isEventStarted) {
                  toast.error('Tidak dapat keluar atau membubarkan tim saat event kompetisi sedang berjalan demi integritas kompetisi.');
                  return;
                }
                setLeaveModalOpen(true);
              }} 
              disabled={loading || isEventStarted} 
              className={`flex items-center gap-1.5 ${isEventStarted ? 'opacity-60 cursor-not-allowed border-amber-500/30 text-amber-400 hover:bg-transparent' : ''}`}
              title={isEventStarted ? 'Terkunci: Event sedang berjalan' : 'Keluar dari squad tim'}
            >
              {isEventStarted ? <Lock className="h-4 w-4 text-amber-400" /> : <LogOut className="h-4 w-4" />}
              {isEventStarted ? 'Roster Terkunci' : 'Leave Team'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Squad Roster Lock Banner if Event Started */}
          {isEventStarted && (
            <div className="p-4 rounded-lg border mb-6 bg-amber-500/10 border-amber-500/30 text-amber-300 flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>Roster Squad Terkunci (Event Sedang Berlangsung)</span>
                    <Badge variant="outline" className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border-amber-500/40">
                      LOCKED
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Anggota tidak dapat keluar atau dikeluarkan dari tim selama event kompetisi sedang berlangsung demi menjaga integritas data scoreboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Squad Member Requirement Status Banner */}
          {team.event?.min_team_size && team.event.min_team_size > 1 && (
            <div className={`p-4 rounded-lg border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              (team.members?.length || 0) >= team.event.min_team_size 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center gap-3">
                {(team.members?.length || 0) >= team.event.min_team_size ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>
                      {(team.members?.length || 0) >= team.event.min_team_size 
                        ? 'Syarat Minimal Anggota Terpenuhi' 
                        : 'Syarat Minimal Anggota Belum Terpenuhi'}
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-mono ${
                      (team.members?.length || 0) >= team.event.min_team_size 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {team.members?.length || 0} / {team.event.min_team_size} Anggota
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(team.members?.length || 0) >= team.event.min_team_size 
                      ? 'Squad Anda telah memenuhi kuota minimal dan siap mengerjakan semua tantangan CTF di arena.'
                      : `Event arena ini mewajibkan minimal ${team.event.min_team_size} anggota per tim. Bagikan Invite Code "${team.invite_code}" kepada rekan tim Anda agar soal arena dapat dibuka.`}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                              onClick={() => {
                                if (isEventStarted) {
                                  toast.error('Tidak dapat mengeluarkan anggota tim saat event kompetisi sedang berjalan.');
                                  return;
                                }
                                setKickTarget({ id: member.user.id, username: member.user.username });
                              }}
                              disabled={loading || isEventStarted}
                              className={`h-7 px-2.5 text-xs ${isEventStarted ? 'opacity-50 cursor-not-allowed text-muted-foreground' : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'}`}
                            >
                              {isEventStarted ? <Lock className="h-3 w-3 mr-1" /> : <UserX className="h-3.5 w-3.5 mr-1" />}
                              {isEventStarted ? 'Locked' : 'Kick'}
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
      {/* Squad History Section */}
      {renderTeamHistorySection()}
    </div>
  );
};

