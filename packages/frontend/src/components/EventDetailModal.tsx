import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, RefreshCw, Calendar, Radio } from 'lucide-react';
import { EventAnalytics } from '@/components/EventAnalytics';
import api from '@/services/api';

interface EventDetailModalProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  eventId,
  open,
  onOpenChange
}) => {
  const [eventData, setEventData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get(`/scoreboard/events/${eventId}/stats`);
      setEventData(res.data);
    } catch (err) {
      console.error('Failed to load event statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && eventId) {
      fetchStats();
    } else if (!open) {
      setEventData(null);
    }
  }, [open, eventId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-black font-outfit text-foreground tracking-wide">
                    {eventData?.event?.name || 'Event Arena'}
                  </DialogTitle>
                  {eventData?.event?.is_active ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold">
                      🟢 ACTIVE ARENA
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold">
                      🔴 INACTIVE
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Format: <strong>{eventData?.event?.participation_mode || 'TEAM'} (Min: {eventData?.event?.min_team_size || 1} • Max: {eventData?.event?.max_team_size || 5})</strong>
                  </span>
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
              className="h-8 gap-1.5 text-xs font-mono"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 cyber-scrollbar">
          {loading && !eventData ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3 font-mono text-xs">
              <RefreshCw className="h-7 w-7 animate-spin text-primary" />
              <span>Loading event statistics & charts...</span>
            </div>
          ) : (
            <EventAnalytics eventData={eventData} />
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
