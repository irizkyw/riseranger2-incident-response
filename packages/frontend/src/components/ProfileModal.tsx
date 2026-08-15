import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Shield, 
  Key, 
  Mail, 
  Calendar, 
  Trophy, 
  Users, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Activity, 
  Lock,
  Sparkles,
  Rocket
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import api from '@/services/api';

interface ProfileModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: (user: any) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  isOpen,
  onOpenChange,
  onProfileUpdated
}) => {
  const isModalOpen = open !== undefined ? open : (isOpen !== undefined ? isOpen : false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);


  // Edit Profile form state
  const [editUsername, setEditUsername] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get('/auth/me');
      setProfileData(res.data);
      setEditUsername(res.data.username || '');
      setEditEmail(res.data.email || '');
    } catch (err: any) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchProfile();
    }
  }, [isModalOpen]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || !editEmail.trim()) {
      toast.error('Username dan Email tidak boleh kosong');
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        username: editUsername.trim(),
        email: editEmail.trim()
      });

      toast.success(res.data.message || 'Profil berhasil diperbarui!');
      
      // Update local storage user object
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updated = {
          ...parsed,
          username: editUsername.trim(),
          email: editEmail.trim()
        };
        localStorage.setItem('user', JSON.stringify(updated));
      }

      // Trigger global event and callback
      window.dispatchEvent(new Event('user-profile-updated'));
      if (onProfileUpdated) {
        onProfileUpdated(res.data.user);
      }

      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Password saat ini harus diisi');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });

      toast.success(res.data.message || 'Password berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('overview');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCopyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Kode invite tim berhasil disalin!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentUser = profileData || (() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  })();

  const initials = currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : 'OP';
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <Dialog open={isModalOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 overflow-hidden sm:max-w-xl max-h-[90vh] flex flex-col">
        {/* Cyber Modal Header */}
        <div className="relative bg-gradient-to-r from-primary/15 via-background to-accent/15 p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary/40 shadow-lg shadow-primary/20">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl tracking-wider">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center shadow" title="Online">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {currentUser?.username || 'Operator'}
                </DialogTitle>
                <Badge variant={isAdmin ? 'destructive' : 'default'} className="text-[10px] uppercase font-mono tracking-wider font-semibold">
                  {currentUser?.role || 'PARTICIPANT'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span>{currentUser?.email || 'N/A'}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b border-border bg-muted/20">
            <TabsList className="grid grid-cols-3 w-full bg-background/80 border border-border">
              <TabsTrigger value="overview" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="edit" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 cyber-scrollbar">
            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="m-0 space-y-5">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Solved</span>
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {profileData?.stats?.solved_count ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Challenges Solved</div>
                </div>

                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Submissions</span>
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {profileData?.stats?.total_submissions ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Flags Submitted</div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Team Score</span>
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {profileData?.team?.score ?? 0} PTS
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Squad Total</div>
                </div>
              </div>

              {/* Event Details */}
              <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Rocket className="h-3.5 w-3.5 text-primary" />
                    Operational Event
                  </span>
                  {profileData?.event ? (
                    <Badge variant="outline" className={profileData.event.is_active ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}>
                      {profileData.event.is_active ? 'ACTIVE ARENA' : 'FROZEN / PAUSED'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">No Active Event</Badge>
                  )}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {profileData?.event?.name || 'Belum terhubung ke Event Arena'}
                </div>
                {profileData?.created_at && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                    <Calendar className="h-3 w-3" />
                    <span>Terdaftar sejak: {new Date(profileData.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              {/* Squad / Team Details */}
              {!isAdmin && (
                <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Squad Information
                    </div>
                    {profileData?.team && (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        ID: {profileData.team.id.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>

                  {profileData?.team ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-card p-2.5 rounded-md border border-border">
                        <div>
                          <div className="font-semibold text-sm text-foreground">{profileData.team.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {profileData.team.leader_id === currentUser.id ? '👑 Squad Commander (Leader)' : 'Operative Member'}
                          </div>
                        </div>

                        {profileData.team.invite_code && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInvite(profileData.team.invite_code)}
                            className="h-8 gap-1.5 text-xs font-mono"
                          >
                            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{profileData.team.invite_code}</span>
                          </Button>
                        )}
                      </div>

                      {profileData.team.members && profileData.team.members.length > 0 && (
                        <div>
                          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                            Squad Roster ({profileData.team.members.length} Operatives):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {profileData.team.members.map((m: any) => (
                              <Badge key={m.id || m.user_id} variant="outline" className="text-xs py-1 px-2.5 bg-card/60">
                                @{m.user?.username || 'operative'}
                                {m.user?.id === profileData.team.leader_id && ' 👑'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-card p-3 rounded border border-border">
                      Anda belum bergabung ke tim manapun. Kunjungi menu <strong>Team Command</strong> untuk membuat atau bergabung ke tim.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: EDIT PROFILE */}
            <TabsContent value="edit" className="m-0 space-y-4">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-medium">Username Operator</Label>
                  <Input
                    id="username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Masukkan username baru..."
                    className="bg-background text-sm"
                    minLength={3}
                    maxLength={25}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">Minimal 3 karakter, maksimal 25 karakter.</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    className="bg-background text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">Email aktif untuk pemulihan dan verifikasi.</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={updatingProfile} className="h-9 text-xs">
                    {updatingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 3: SECURITY & PASSWORD */}
            <TabsContent value="security" className="m-0 space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currPass" className="text-xs font-medium">Password Saat Ini</Label>
                  <div className="relative">
                    <Input
                      id="currPass"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini..."
                      className="bg-background pr-10 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPass" className="text-xs font-medium">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="newPass"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter..."
                      className="bg-background pr-10 text-sm"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confPass" className="text-xs font-medium">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="confPass"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru..."
                      className="bg-background pr-10 text-sm"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={changingPassword} className="h-9 text-xs">
                    {changingPassword ? 'Memperbarui Password...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
