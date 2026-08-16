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
  Rocket, 
  BarChart3 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PersonalAnalytics } from '@/components/PersonalAnalytics';
import { EventDetailModal } from '@/components/EventDetailModal';
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
  const [selectedInspectEventId, setSelectedInspectEventId] = useState<string | null>(null);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get('/auth/me');
      setProfileData(res.data);
      setEditUsername(res.data.username || '');
      setEditEmail(res.data.email || '');
      
      const evtId = res.data.event_id || res.data.event?.id || res.data.team?.event?.id || res.data.team?.event_id;
      if (evtId && !selectedEventId) {
        setSelectedEventId(evtId);
      }
    } catch (err: any) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/scoreboard/events');
      setEventsList(res.data || []);
      if (res.data && res.data.length > 0 && !selectedEventId) {
        setSelectedEventId(res.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load events list:', err);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchProfile();
      fetchEvents();
    }
  }, [isModalOpen]);

  const activeEventObj = profileData?.event || profileData?.team?.event;
  const activeEventId = profileData?.event_id || profileData?.event?.id || profileData?.team?.event?.id || profileData?.team?.event_id;
  const currentEventId = selectedEventId || activeEventId || eventsList[0]?.id;
  const currentEventObj = eventsList.find((e) => e.id === currentEventId) || activeEventObj || eventsList[0];

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-card border-border shadow-2xl p-0 overflow-hidden flex flex-col">
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
              <TabsTrigger value="overview" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                <Activity className="h-3.5 w-3.5" />
                <span>Overview & Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="edit" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                <Settings className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                <Lock className="h-3.5 w-3.5" />
                <span>Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 cyber-scrollbar">
            {/* TAB 1: OVERVIEW & ANALYTICS */}
            <TabsContent value="overview" className="m-0 space-y-5">
              {/* Event Details Ribbon & Combobox */}
              <div className="border border-border rounded-lg p-3 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap flex-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Rocket className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Arena:</span>
                  </div>
                  {eventsList.length > 1 ? (
                    <Select
                      value={currentEventId || ''}
                      onValueChange={(val) => {
                        setSelectedEventId(val);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs font-mono bg-background/80 border-primary/30 text-primary w-auto min-w-[200px] max-w-[320px] font-bold">
                        <SelectValue placeholder="Select Event Arena" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-[10005]">
                        {eventsList.map((e) => (
                          <SelectItem key={e.id} value={e.id} className="text-xs font-mono">
                            <span className="flex items-center gap-1.5">
                              <span>{e.is_active ? '🟢' : '⏸️'}</span>
                              <span className="font-bold">{e.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">
                      <strong className="text-primary font-mono">{currentEventObj?.name || 'Not Connected to Arena'}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {currentEventId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInspectEventId(currentEventId)}
                      className="h-7 px-2.5 text-[11px] gap-1.5 font-mono font-bold text-primary border-primary/40 hover:bg-primary hover:text-black transition-colors"
                      title="Inspect event arena statistics, accuracy charts, and leaderboard"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Event Analytics 📊</span>
                    </Button>
                  )}
                  {currentEventObj && (
                    <Badge variant="outline" className={currentEventObj.is_active ? "text-emerald-400 border-emerald-500/30 text-[10px]" : "text-amber-400 border-amber-500/30 text-[10px]"}>
                      {currentEventObj.is_active ? '🟢 ACTIVE' : '⏸️ FROZEN'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Personal and Team Analytics Component */}
              <PersonalAnalytics
                stats={profileData?.stats}
                team={profileData?.team}
                currentUserId={profileData?.id || currentUser?.id}
              />
            </TabsContent>

            {/* TAB 2: EDIT PROFILE */}
            <TabsContent value="edit" className="m-0 space-y-4">
              {(() => {
                const activeEvent = profileData?.event || profileData?.team?.event;
                const isEventStarted = profileData?.role !== 'ADMIN' && activeEvent?.start_time && new Date() >= new Date(activeEvent.start_time);
                
                return (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    {isEventStarted && (
                      <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 text-xs text-amber-300">
                        <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-bold text-foreground block">Profile Locked (Event in Progress)</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Username and email edits are temporarily disabled while event <strong>{activeEvent?.name}</strong> is in progress to preserve competition integrity.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-xs font-medium">Operative Username</Label>
                      <Input
                        id="username"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="Enter username..."
                        disabled={updatingProfile || isEventStarted}
                        className={`bg-background text-sm ${isEventStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
                        minLength={3}
                        maxLength={25}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Between 3 to 25 characters.</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="name@domain.com"
                        disabled={updatingProfile || isEventStarted}
                        className={`bg-background text-sm ${isEventStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Active email address for verification and recovery.</span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={updatingProfile || isEventStarted} className="h-9 text-xs">
                        {isEventStarted ? 'Locked: Event Active' : updatingProfile ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                );
              })()}
            </TabsContent>


            {/* TAB 3: SECURITY & PASSWORD */}
            <TabsContent value="security" className="m-0 space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currPass" className="text-xs font-medium">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currPass"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password..."
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
                  <Label htmlFor="newPass" className="text-xs font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPass"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters..."
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
                  <Label htmlFor="confPass" className="text-xs font-medium">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confPass"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password..."
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
                    {changingPassword ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </div>
        </Tabs>

        {/* EVENT STATS & PERFORMANCE MODAL */}
        <EventDetailModal
          eventId={selectedInspectEventId}
          open={Boolean(selectedInspectEventId)}
          onOpenChange={(open) => !open && setSelectedInspectEventId(null)}
        />
      </DialogContent>
    </Dialog>
  );
};
