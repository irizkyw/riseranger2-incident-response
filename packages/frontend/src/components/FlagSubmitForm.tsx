import React, { useState } from 'react';
import { Flag, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';

interface FlagSubmitFormProps {
  challengeId: string;
  isSolved: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  onSuccess: (pointsAwarded: number, isFirstBlood: boolean) => void;
}

export const FlagSubmitForm: React.FC<FlagSubmitFormProps> = ({
  challengeId,
  isSolved,
  disabled = false,
  disabledMessage,
  onSuccess,
}) => {
  const [flag, setFlag] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading || disabled) {
      return;
    }
    if (!flag.trim()) {
      toast.error('Please enter a flag to submit!');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const res = await api.post('/challenges/submit', {
        challenge_id: challengeId,
        flag: flag.trim(),
      });

      if (res.data.success) {
        if (res.data.is_first_blood) {
          toast.success(res.data.message, {
            icon: <Sparkles className="h-5 w-5 text-yellow-400 animate-spin" />,
            duration: 6000,
          });
        } else {
          toast.success(res.data.message, {
            icon: <CheckCircle2 className="h-5 w-5 text-cyber-green" />,
          });
        }
        setFlag('');
        onSuccess(res.data.points_awarded, res.data.is_first_blood);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to submit flag!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      // Small cooldown to prevent immediate accidental double-submit
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  };

  if (isSolved) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-cyber-green/50 bg-cyber-green/10 p-4 text-center font-bold text-cyber-green shadow-[0_0_20px_rgba(0,255,102,0.2)]">
        <CheckCircle2 className="h-6 w-6" /> Your team has already captured the flag for this challenge!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Flag className={`h-4 w-4 ${disabled ? 'text-muted-foreground' : 'text-cyber-cyan'}`} />
        </div>
        <Input
          type="text"
          placeholder={disabled ? (disabledMessage || '🔒 Form dinonaktifkan / terkunci...') : 'CTF{your_secret_flag_here}'}
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          disabled={loading || disabled}
          className={`pl-9 h-12 bg-black/60 font-mono text-base shadow-[0_0_15px_rgba(0,240,255,0.1)] ${
            disabled 
              ? 'border-border/60 text-muted-foreground cursor-not-allowed opacity-60 bg-black/30' 
              : 'border-cyber-cyan/40 text-white placeholder:text-muted-foreground focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan'
          }`}
        />
      </div>
      <Button
        type="submit"
        variant="cyber"
        disabled={loading || disabled || !flag.trim()}
        className={`h-12 px-6 font-bold tracking-wider flex items-center gap-2 ${
          disabled ? 'opacity-40 cursor-not-allowed text-muted-foreground bg-muted' : 'text-black'
        }`}
      >
        <Send className="h-4 w-4" />
        {loading ? 'Submitting...' : 'Hit The Flag'}
      </Button>
    </form>
  );
};
