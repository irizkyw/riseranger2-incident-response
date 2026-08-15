import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Lock, ShieldQuestion, Cpu, FileCode, Terminal, Download, HelpCircle, Trophy, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FlagSubmitForm } from '@/components/FlagSubmitForm';
import { toast } from 'sonner';
import api from '@/services/api';

export const ChallengeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSolved, setIsSolved] = useState(false);
  const [unlockedHint, setUnlockedHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requireMinMembers, setRequireMinMembers] = useState<{ min: number; current: number } | null>(null);

  const fetchDetail = async () => {
    try {
      setErrorMessage(null);
      setRequireMinMembers(null);
      // Fetch detail
      const detailRes = await api.get(`/challenges/${id}`);
      setChallenge(detailRes.data);

      try {
        const listRes = await api.get('/challenges');
        const match = listRes.data.find((c: any) => c.id === id);
        if (match) setIsSolved(match.is_solved_by_me);
      } catch (e) {}
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.require_min_members) {
        setRequireMinMembers({ min: errData.min_team_size, current: errData.current_team_size });
        setErrorMessage(errData.error);
      } else if (errData?.error) {
        setErrorMessage(errData.error);
      } else {
        toast.error('Failed to load challenge details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const handleUnlockHint = async () => {
    setHintLoading(true);
    try {
      const res = await api.post(`/challenges/${id}/hint`);
      setUnlockedHint(res.data.hint);
      toast.success(`Hint unlocked! -${res.data.cost_deducted} points from your team.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unlock hint');
    } finally {
      setHintLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Challenge Specs...</div>;
  }

  if (errorMessage || !challenge) {
    return (
      <div className="container mx-auto p-12 text-center max-w-lg space-y-4">
        <div className="p-8 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Tantangan Tidak Dapat Diakses</h2>
          <p className="text-sm text-muted-foreground">
            {errorMessage || 'Tantangan tidak ditemukan atau arena sedang tidak aktif.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {requireMinMembers ? (
              <Link to="/team">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  Kelola Anggota Tim
                </Button>
              </Link>
            ) : null}
            <Link to="/dashboard">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Arena</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-cyber-cyan hover:underline font-outfit">
        <ArrowLeft className="h-4 w-4" /> BACK TO CHALLENGES
      </Link>

      <Card className="border-cyber-cyan/50 bg-black/60 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1 uppercase font-semibold">
                {challenge.category}
              </Badge>
              <span className="font-mono text-2xl font-black text-primary">{challenge.points} PTS</span>
              {challenge.is_locked && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold uppercase text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Locked Challenge
                </Badge>
              )}
            </div>

            {challenge.first_blood && (
              <div className="flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-400 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] animate-pulse">
                <Trophy className="h-4 w-4" /> First Blood: {challenge.first_blood.team.name}
              </div>
            )}
          </div>

          <CardTitle className="mt-4 text-3xl font-black font-outfit text-white tracking-wide">
            {challenge.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {challenge.is_locked && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Tantangan Ini Masih Terkunci</h4>
                <p className="text-xs text-amber-200/90 mt-1">
                  Event ini menggunakan mode <strong>Tantangan Berantai (Chained Mode)</strong>. Anda harus menyelesaikan tantangan <strong>"{challenge.unlocks_after_title || 'sebelumnya'}"</strong> di kategori {challenge.category} terlebih dahulu agar bisa membuka tantangan ini.
                </p>
              </div>
            </div>
          )}

          <div className={`prose prose-invert max-w-none font-mono text-slate-300 whitespace-pre-wrap bg-black/40 p-6 rounded-lg border border-white/5 leading-relaxed ${challenge.is_locked ? 'opacity-50 select-none' : ''}`}>
            {challenge.description}
          </div>

          {challenge.file_url && !challenge.is_locked && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 font-mono text-sm text-foreground">
                <Download className="h-4 w-4 text-primary" />
                <span>Attachment / Challenge Files Available</span>
              </div>
              <a href={challenge.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="default" size="sm" className="font-bold">
                  Download Files
                </Button>
              </a>
            </div>
          )}

          {/* Hint Section */}
          {!challenge.is_locked && (
            <div className="pt-2">
              {unlockedHint ? (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-outfit">
                    <HelpCircle className="h-4 w-4" /> Unlocked Hint (-{challenge.hint_cost} PTS)
                  </div>
                  <p className="font-mono text-sm text-white">{unlockedHint}</p>
                </div>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                      <HelpCircle className="mr-1.5 h-4 w-4" /> Request Hint (Cost: {challenge.hint_cost || 0} PTS)
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unlock Challenge Hint</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to unlock the hint for this challenge? This will immediately deduct <strong className="text-amber-400">{challenge.hint_cost || 0} points</strong> from your team's score!
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleUnlockHint} disabled={hintLoading}>
                        {hintLoading ? 'Unlocking...' : 'Confirm Unlock'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {/* Submit Form */}
          <div className="pt-6 border-t border-border/40">
            <h4 className="text-sm font-bold text-foreground uppercase font-outfit mb-3">Submit Captured Flag</h4>
            {challenge.is_locked ? (
              <div className="p-4 rounded-lg bg-muted/40 border border-border text-center text-xs text-muted-foreground font-mono">
                🔒 Form pengiriman flag dinonaktifkan sampai tantangan sebelumnya selesai.
              </div>
            ) : (
              <FlagSubmitForm
                challengeId={challenge.id}
                isSolved={isSolved}
                onSuccess={() => setIsSolved(true)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
