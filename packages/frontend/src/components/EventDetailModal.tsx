import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, RefreshCw, Calendar, AlertCircle, Layers } from 'lucide-react';
import { EventAnalytics } from '@/components/EventAnalytics';
import api from '@/services/api';

interface EventDetailModalProps {
  eventId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  eventId,
  open,
  onOpenChange
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [eventData, setEventData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all created events for the combobox selector
  const fetchAllEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await api.get('/scoreboard/events?all=true');
      if (Array.isArray(res.data)) {
        setEventsList(res.data);
      }
    } catch (err) {
      console.error('Failed to load events list:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Fetch event analytics data by ID
  const fetchStats = useCallback(async (targetEventId?: string) => {
    const idToFetch = targetEventId || selectedEventId || eventId || 'active';
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/scoreboard/events/${idToFetch}/stats`);
      setEventData(res.data);
      if (res.data?.event?.id) {
        setSelectedEventId(res.data.event.id);
      }
    } catch (err: any) {
      console.error('Failed to load event statistics:', err);
      setError(err.response?.data?.error || 'Failed to load event statistics.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, eventId]);

  useEffect(() => {
    if (open) {
      fetchAllEvents();
      const initialId = eventId || 'active';
      setSelectedEventId(initialId);
      fetchStats(initialId);
    } else {
      setEventData(null);
      setError(null);
    }
  }, [open, eventId]);

  const handleSelectEvent = (newId: string) => {
    setSelectedEventId(newId);
    fetchStats(newId);
  };

  const currentEvent = eventData?.event;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] max-h-[85dvh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pr-12 sm:pr-5 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* ROW 1 & 2 CONTAINER */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm shrink-0 mt-0.5 sm:mt-0">
                <Rocket className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {/* ROW 1: Combobox Event Selector */}
                <div className="w-full max-w-xl">
                  {eventsList.length > 0 ? (
                    <Select value={selectedEventId} onValueChange={handleSelectEvent}>
                      <SelectTrigger className="h-9 w-full font-outfit text-sm font-bold bg-background/90 border-primary/40 text-foreground shadow-sm focus:ring-primary">
                        <div className="flex items-center gap-2 truncate">
                          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                          <SelectValue placeholder="Select Competition Arena..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-[10005] max-h-72">
                        {eventsList.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id} className="py-2 font-mono text-xs cursor-pointer">
                            <div className="flex items-center justify-between w-full min-w-[240px] gap-3">
                              <div className="flex items-center gap-2 font-bold text-foreground truncate">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: ev.is_active ? '#10B981' : ev.is_finished ? '#F59E0B' : '#64748B' }}
                                />
                                <span className="truncate">{ev.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 font-sans">
                                {ev._count?.teams !== undefined && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                    {ev._count.teams} Squads
                                  </span>
                                )}
                                {ev.is_active ? (
                                  <span className="text-emerald-400 font-semibold">Active</span>
                                ) : ev.is_finished ? (
                                  <span className="text-amber-400 font-semibold">Concluded</span>
                                ) : (
                                  <span className="text-muted-foreground">Inactive</span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <DialogTitle className="text-base sm:text-lg font-bold font-outfit text-foreground tracking-wide truncate">
                      {currentEvent?.name || 'Event Arena'}
                    </DialogTitle>
                  )}
                </div>

                {/* ROW 2: Status Badge + Format (Side-by-Side) */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {currentEvent?.is_active ? (
                    <Badge variant="outline" className="font-mono text-xs font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1.5 px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE ARENA
                    </Badge>
                  ) : currentEvent?.is_finished ? (
                    <Badge variant="outline" className="font-mono text-xs font-semibold text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1.5 px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      CONCLUDED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-xs font-semibold text-muted-foreground border-border bg-muted/20 gap-1.5 px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      INACTIVE
                    </Badge>
                  )}

                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 m-0">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>
                      Format: <strong className="text-foreground">{currentEvent?.participation_mode || 'TEAM'} (Min: {currentEvent?.min_team_size || 1} • Max: {currentEvent?.max_team_size || 5})</strong>
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStats()}
                disabled={loading || eventsLoading}
                className="h-8 gap-1.5 text-xs font-mono border-border hover:border-primary/50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Stats</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 cyber-scrollbar">
          {loading && !eventData ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3 font-mono text-xs">
              <RefreshCw className="h-7 w-7 animate-spin text-primary" />
              <span>Loading event statistics & charts...</span>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 p-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchStats()} className="gap-2 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
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


