import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Users, Calendar, Mail, CheckCircle2, Lock, Save, Sparkles, RefreshCw, Activity, Target, Trophy, BarChart3, Rocket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalAnalytics } from '@/components/PersonalAnalytics';
import { EventDetailModal } from '@/components/EventDetailModal';
import api from '@/services/api';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inspectEventId, setInspectEventId] = useState<string | null>(null);
  
  // Profile update form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password update form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      setProfile(res.data);
      setUsername(res.data.username || '');
      setEmail(res.data.email || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast.error('Gagal memuat profil pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      toast.error('Username dan email tidak boleh kosong');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await api.put('/auth/profile', { username, email });
      toast.success(res.data.message || 'Profil berhasil diperbarui!');
      
      // Update local storage user
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({ ...parsed, username, email }));
      }
      
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Mohon isi password saat ini dan password baru');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success(res.data.message || 'Password berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header Profile Hero Card */}
      <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-primary/40 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {profile?.username?.slice(0, 2).toUpperCase() || 'OP'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black font-outfit text-foreground tracking-wide">
                  {profile?.username}
                </h1>
                <Badge variant={profile?.role === 'ADMIN' ? 'default' : 'secondary'} className="uppercase font-bold">
                  {profile?.role === 'ADMIN' ? '🛡️ HQ COMMANDER' : '⚡ OPERATOR'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {profile?.email}
              </p>
            </div>
          </div>

          {profile?.team && (
            <div className="bg-muted/40 p-4 rounded-xl border border-border/80 min-w-[200px]">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Squad Command
              </div>
              <div className="text-lg font-bold text-foreground truncate">{profile.team.name}</div>
              <div className="text-xs font-mono text-primary mt-0.5">{profile.team.score} Points Accumulated</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Setting */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border flex flex-wrap">
          <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs md:text-sm font-bold font-outfit uppercase">
            <Activity className="h-4 w-4 text-primary" /> Statistik & Performa
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2 text-xs md:text-sm font-bold font-outfit uppercase">
            <User className="h-4 w-4" /> Pengaturan Akun
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 text-xs md:text-sm font-bold font-outfit uppercase">
            <Lock className="h-4 w-4" /> Keamanan & Password
          </TabsTrigger>
          <TabsTrigger value="deployment" className="flex items-center gap-2 text-xs md:text-sm font-bold font-outfit uppercase">
            <Shield className="h-4 w-4" /> Status Event & Arena
          </TabsTrigger>
        </TabsList>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          <PersonalAnalytics
            stats={profile?.stats}
            team={profile?.team}
            currentUserId={profile?.id}
          />
        </TabsContent>

        {/* ACCOUNT TAB */}
        <TabsContent value="account">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-xl">Profile Information</CardTitle>
              <CardDescription>
                Perbarui identitas operator dan alamat email akun Anda.
              </CardDescription>
            </CardHeader>
            {(() => {
              const activeEvent = profile?.event || profile?.team?.event;
              const isEventStarted = profile?.role !== 'ADMIN' && activeEvent?.start_time && new Date() >= new Date(activeEvent.start_time);

              return (
                <form onSubmit={handleUpdateProfile}>
                  <CardContent className="space-y-4 max-w-lg">
                    {isEventStarted && (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 text-xs text-amber-300">
                        <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-bold text-foreground block">Profil Terkunci (Event Sedang Berlangsung)</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Perubahan username dan email dinonaktifkan sementara selama event <strong>{activeEvent?.name}</strong> sedang berlangsung demi menjaga integritas kompetisi.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Username / Callsign</label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. shadow_stalker"
                        disabled={profileSaving || isEventStarted}
                        className={isEventStarted ? 'opacity-60 cursor-not-allowed' : ''}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="operator@ctf.local"
                        disabled={profileSaving || isEventStarted}
                        className={isEventStarted ? 'opacity-60 cursor-not-allowed' : ''}
                        required
                      />
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <label className="text-sm font-medium text-muted-foreground">Account Role</label>
                      <Input
                        value={profile?.role || 'PARTICIPANT'}
                        disabled
                        className="bg-muted/40 font-mono text-muted-foreground cursor-not-allowed"
                      />
                      <p className="text-[11px] text-muted-foreground">Peran akun diatur oleh sistem dan HQ Admin.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border pt-4">
                    <Button type="submit" variant="default" disabled={profileSaving || isEventStarted} className="gap-2">
                      {profileSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isEventStarted ? 'Terkunci: Event Sedang Berjalan' : profileSaving ? 'Saving Changes...' : 'Save Profile'}
                    </Button>
                  </CardFooter>
                </form>
              );
            })()}
          </Card>
        </TabsContent>


        {/* SECURITY TAB */}
        <TabsContent value="security">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-xl">Change Password</CardTitle>
              <CardDescription>
                Pastikan Anda menggunakan password yang aman dan tidak dibagikan kepada orang lain.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-4">
                <Button type="submit" variant="default" disabled={passwordSaving} className="gap-2">
                  {passwordSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* DEPLOYMENT / EVENT TAB */}
        <TabsContent value="deployment">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-xl">CTF Deployment & Affiliation</CardTitle>
              <CardDescription>
                Status keikutsertaan event dan keanggotaan tim saat ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Active Event</span>
                    <Badge variant="outline">VERIFIED</Badge>
                  </div>
                  <div className="text-lg font-bold text-foreground flex items-center justify-between">
                    <span>{profile?.event?.name || profile?.team?.event?.name || 'Default Arena'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Status: {profile?.event?.is_active ? '🟢 Open & Active' : '🔴 Inactive'}
                  </p>
                  {(profile?.event?.id || profile?.team?.event?.id || profile?.event_id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectEventId(profile?.event?.id || profile?.team?.event?.id || profile?.event_id)}
                      className="w-full text-xs gap-1.5 font-mono font-bold text-primary border-primary/40 hover:bg-primary hover:text-black"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Lihat Statistik Event Lengkap 📊</span>
                    </Button>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Squad Affiliation</span>
                    {profile?.team && <Badge variant="secondary">TEAM MEMBER</Badge>}
                  </div>
                  <div className="text-lg font-bold">{profile?.team?.name || 'No Squad Joined'}</div>
                  {profile?.team && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Invite Code: <span className="text-primary font-bold">{profile.team.invite_code}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EVENT STATS & PERFORMANCE MODAL */}
      <EventDetailModal
        eventId={inspectEventId}
        open={Boolean(inspectEventId)}
        onOpenChange={(open) => !open && setInspectEventId(null)}
      />
    </div>
  );
};
