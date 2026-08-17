import React, { useEffect, useState } from 'react';
import {
  Users,
  Trophy,
  X,
  RefreshCw,
  ExternalLink,
  Target,
  Crown,
  History,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamAnalytics } from '@/components/TeamAnalytics';
import api from '@/services/api';
import { toast } from 'sonner';

interface TeamDetailModalProps {
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  teamId,
  open,
  onOpenChange,
  currentUserId
}) => {
  const [teamData, setTeamData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTeamDetails = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await api.get(`/teams/${teamId}`);
      setTeamData(res.data);
    } catch (err: any) {
      console.error('Failed to load team details:', err);
      toast.error('Failed to load team analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && teamId) {
      fetchTeamDetails();
    } else if (!open) {
      setTeamData(null);
    }
  }, [open, teamId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-4xl max-h-[85vh] max-h-[85dvh] overflow-y-auto p-3.5 sm:p-6 custom-scrollbar">
        <DialogHeader className="border-b border-border/60 pb-3 pr-8 sm:pr-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shadow-sm shrink-0 font-mono"
                style={{
                  backgroundColor: `${teamData?.color || '#00F0FF'}20`,
                  color: teamData?.color || '#00F0FF',
                  border: `1px solid ${teamData?.color || '#00F0FF'}40`
                }}
              >
                {teamData?.name ? teamData.name.slice(0, 2).toUpperCase() : 'SQ'}
              </div>
              <div>
                <DialogTitle className="text-xl font-black font-outfit uppercase text-foreground flex items-center gap-2 flex-wrap">
                  <span>{teamData?.name || 'Loading Squad Data...'}</span>
                  {teamData?.rank && (
                    <Badge variant="outline" className="text-xs font-mono bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                      Rank #{teamData.rank}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Squad analytics, flag accuracy breakdown, and member score roster
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTeamDetails}
                disabled={loading}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center space-y-3 font-mono text-xs text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p>Loading squad performance analytics...</p>
          </div>
        ) : !teamData ? (
          <div className="py-16 text-center text-muted-foreground text-xs font-mono">
            Squad data not found.
          </div>
        ) : (
          <div className="py-2">
            <TeamAnalytics team={teamData} currentUserId={currentUserId} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
