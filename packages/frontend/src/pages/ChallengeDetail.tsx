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

  const fetchDetail = async () => {
    try {
      // Fetch both list (to check solved status) and detail
      const [listRes, detailRes] = await Promise.all([
        api.get('/challenges'),
        api.get(`/challenges/${id}`)
      ]);
      const match = listRes.data.find((c: any) => c.id === id);
      if (match) setIsSolved(match.is_solved_by_me);
      setChallenge(detailRes.data);
    } catch (err) {
      toast.error('Failed to load challenge details');
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

  if (!challenge) {
    return (
      <div className="container mx-auto p-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Challenge Not Found</h2>
        <Link to="/dashboard">
          <Button variant="cyber"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Arena</Button>
        </Link>
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
              <Badge variant="cyber" className="text-sm px-3 py-1">
                {challenge.category}
              </Badge>
              <span className="font-mono text-2xl font-black text-cyber-cyan">{challenge.points} PTS</span>
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
          <div className="prose prose-invert max-w-none font-mono text-slate-300 whitespace-pre-wrap bg-black/40 p-6 rounded-lg border border-white/5 leading-relaxed">
            {challenge.description}
          </div>

          {challenge.file_url && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-cyber-purple/10 border border-cyber-purple/40">
              <div className="flex items-center gap-2 font-mono text-sm text-white">
                <Download className="h-4 w-4 text-cyber-purple" />
                <span>Attachment / Challenge Files Available</span>
              </div>
              <a href={challenge.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="default" size="sm" className="bg-cyber-purple hover:bg-cyber-purple/90 font-bold">
                  Download Files
                </Button>
              </a>
            </div>
          )}

          {/* Hint Section */}
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

          {/* Submit Form */}
          <div className="pt-6 border-t border-border/40">
            <h4 className="text-sm font-bold text-cyber-cyan uppercase font-outfit mb-3">Submit Captured Flag</h4>
            <FlagSubmitForm
              challengeId={challenge.id}
              isSolved={isSolved}
              onSuccess={() => setIsSolved(true)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
