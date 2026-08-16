import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldQuestion, Globe, Lock, Cpu, Terminal, FileCode } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChallengeCardProps {
  id: string;
  title: string;
  category: string;
  points: number;
  is_solved_by_me: boolean;
  is_locked?: boolean;
  unlocks_after_title?: string | null;
  total_solves: number;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  id,
  title,
  category,
  points,
  is_solved_by_me,
  is_locked = false,
  unlocks_after_title,
  total_solves,
}) => {
  const getCategoryIcon = () => {
    switch (category) {
      case 'WEB':
      case 'WEB_EXPLOITATION': return <Globe className="h-3.5 w-3.5 mr-1" />;
      case 'CRYPTO':
      case 'CRYPTOGRAPHY': return <Lock className="h-3.5 w-3.5 mr-1" />;
      case 'FORENSIC':
      case 'DIGITAL_FORENSICS': return <ShieldQuestion className="h-3.5 w-3.5 mr-1" />;
      case 'PWN':
      case 'INCIDENT_RESPONSE': return <Cpu className="h-3.5 w-3.5 mr-1" />;
      case 'REVERSE':
      case 'REVERSE_ENGINEERING': return <FileCode className="h-3.5 w-3.5 mr-1" />;
      default: return <Terminal className="h-3.5 w-3.5 mr-1" />;
    }
  };

  const user = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();
  const isStaff = Boolean(user?.role && user.role !== 'PARTICIPANT');
  const effectiveLocked = !isStaff && is_locked;

  const handleClick = (e: React.MouseEvent) => {
    if (effectiveLocked) {
      e.preventDefault();
    }
  };

  return (
    <Link
      to={effectiveLocked ? '#' : `/challenge/${id}`}
      onClick={handleClick}
      className={effectiveLocked ? 'cursor-not-allowed select-none' : 'cursor-pointer group'}
    >
      <Card className={`relative h-full overflow-hidden transition-all duration-200 ${effectiveLocked
        ? 'opacity-65 border-white/5 bg-background/40 hover:border-amber-500/20 select-none'
        : is_solved_by_me
          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-muted/50 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]'
        }`}>
        {is_solved_by_me && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Solved
          </div>
        )}

        {is_locked && !is_solved_by_me && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold uppercase">
            <Lock className="h-3 w-3" /> {isStaff ? 'Locked' : 'Locked'}
          </div>
        )}

        <CardHeader className="pb-3 pr-28">
          <div className="flex items-center">
            <Badge variant="secondary" className="font-medium uppercase text-xs">
              {getCategoryIcon()}
              {category}
            </Badge>
          </div>
          <CardTitle className={`mt-2 text-xl font-semibold tracking-tight ${effectiveLocked ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary transition-colors'}`}>
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {is_locked && unlocks_after_title && (
            <div className="rounded bg-amber-500/5 border border-amber-500/20 px-2.5 py-1.5 text-[11px] text-amber-300/80 flex items-center gap-1.5">
              <Lock className="h-3 w-3 shrink-0 text-amber-400" />
              <span className="truncate">Requires: <strong>{unlocks_after_title}</strong></span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground pt-1 border-t border-border/40">
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <span className="text-lg font-mono">{points}</span> PTS
            </div>
            <div className="text-xs">
              {total_solves} {total_solves === 1 ? 'solve' : 'solves'}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
