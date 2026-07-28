import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldQuestion, Globe, Lock, Cpu, Terminal, FileCode } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChallengeCardProps {
  id: string;
  title: string;
  category: 'WEB' | 'CRYPTO' | 'FORENSIC' | 'PWN' | 'MISC' | 'REVERSE';
  points: number;
  is_solved_by_me: boolean;
  total_solves: number;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  id,
  title,
  category,
  points,
  is_solved_by_me,
  total_solves,
}) => {
  const getCategoryIcon = () => {
    switch (category) {
      case 'WEB': return <Globe className="h-3.5 w-3.5 mr-1" />;
      case 'CRYPTO': return <Lock className="h-3.5 w-3.5 mr-1" />;
      case 'FORENSIC': return <ShieldQuestion className="h-3.5 w-3.5 mr-1" />;
      case 'PWN': return <Cpu className="h-3.5 w-3.5 mr-1" />;
      case 'REVERSE': return <FileCode className="h-3.5 w-3.5 mr-1" />;
      default: return <Terminal className="h-3.5 w-3.5 mr-1" />;
    }
  };

  return (
    <Link to={`/challenge/${id}`}>
      <Card className={`relative h-full overflow-hidden transition-colors hover:bg-muted/50 ${is_solved_by_me ? 'border-primary/50 bg-primary/5' : ''}`}>
        {is_solved_by_me && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Solved
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="font-medium uppercase">
              {getCategoryIcon()}
              {category}
            </Badge>
          </div>
          <CardTitle className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1 font-semibold text-foreground">
            <span className="text-lg">{points}</span> PTS
          </div>
          <div>
            {total_solves} {total_solves === 1 ? 'solve' : 'solves'}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
