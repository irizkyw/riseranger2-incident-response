import React, { useState } from 'react';
import { Trophy, Shield, Zap, Radio, Table as TableIcon, Rocket, Crosshair, ArrowLeft, BarChart2, Users, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamDetailModal } from '@/components/TeamDetailModal';

interface AttackLog {
  id: string;
  teamName: string;
  challengeTitle?: string;
  success: boolean;
  isFirstBlood: boolean;
  pointsGained: number;
  timestamp: string;
}

interface ScoreboardOverlayProps {
  teams: any[];
  attackLogs: AttackLog[];
  onToggleView: () => void;
  onSelectTeam: (team: any) => void;
  selectedTeam: any | null;
  onResetCamera: () => void;
  onBack?: () => void;
  countdownText?: string;
  inspectModalTeamId?: string | null;
  onInspectModalChange?: (teamId: string | null) => void;
}

export const ScoreboardOverlay: React.FC<ScoreboardOverlayProps> = ({
  teams,
  attackLogs,
  onToggleView,
  onSelectTeam,
  selectedTeam,
  onResetCamera,
  onBack,
  countdownText,
  inspectModalTeamId: externalInspectModalTeamId,
  onInspectModalChange
}) => {
  const [internalInspectModalTeamId, setInternalInspectModalTeamId] = useState<string | null>(null);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [showMobileFeed, setShowMobileFeed] = useState(false);

  const inspectModalTeamId = externalInspectModalTeamId !== undefined ? externalInspectModalTeamId : internalInspectModalTeamId;
  const setInspectModalTeamId = (id: string | null) => {
    if (onInspectModalChange) {
      onInspectModalChange(id);
    } else {
      setInternalInspectModalTeamId(id);
    }
  };
  const topTeams = teams.slice(0, 10);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 md:p-6 overflow-hidden z-20">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-3 pointer-events-auto w-full">
        {/* Left: Branding & Quick Actions */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center justify-between gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-cyber-cyan/40 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/60 shrink-0">
                <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyber-cyan animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-outfit font-black text-white text-xs sm:text-base tracking-wide flex items-center gap-1">
                    SPACE BATTLE <Badge variant="outline" className="sm:text-[10px] px-1 py-0">LIVE</Badge>
                  </h1>
                </div>
                <p className="text-[9px] sm:text-[11px] font-mono text-muted-foreground hidden sm:block">REAL-TIME SOLAR CORE ASSAULT ARENA</p>
              </div>
            </div>

            {/* Mobile Toggles for Panels */}
            <div className="flex items-center gap-1.5 md:hidden">
              <Button
                variant={showMobileLeaderboard ? "cyber" : "outline"}
                size="sm"
                onClick={() => {
                  setShowMobileLeaderboard(!showMobileLeaderboard);
                  if (showMobileFeed) setShowMobileFeed(false);
                }}
                className="h-7 px-2 text-[11px] font-bold border-yellow-500/40 text-yellow-400 bg-black/60"
              >
                <Trophy className="h-3 w-3 mr-1 text-yellow-400" />
                Rank
              </Button>
              <Button
                variant={showMobileFeed ? "cyber" : "outline"}
                size="sm"
                onClick={() => {
                  setShowMobileFeed(!showMobileFeed);
                  if (showMobileLeaderboard) setShowMobileLeaderboard(false);
                }}
                className="h-7 px-2 text-[11px] font-bold border-cyber-cyan/40 text-cyber-cyan bg-black/60"
              >
                <Radio className="h-3 w-3 mr-1 text-red-500 animate-pulse" />
                Feed
              </Button>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-7 sm:h-8 text-[11px] sm:text-xs border-white/20 bg-black/70 text-white hover:bg-white/10 hover:text-cyber-cyan flex items-center gap-1 backdrop-blur-md font-bold px-2.5 sm:px-3"
              >
                <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Dashboard
              </Button>
            )}
            <Button
              variant="cyber"
              size="sm"
              onClick={onToggleView}
              className="h-7 sm:h-8 text-[11px] sm:text-xs flex items-center gap-1 shadow-[0_0_15px_rgba(0,240,255,0.3)] font-bold px-2.5 sm:px-3"
            >
              <TableIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> 2D Table
            </Button>
            {selectedTeam && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectModalTeamId(selectedTeam.id)}
                  className="h-7 sm:h-8 text-[11px] sm:text-xs border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan hover:bg-cyber-cyan/25 flex items-center gap-1 font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] px-2.5 sm:px-3"
                >
                  <BarChart2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {selectedTeam.name}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetCamera}
                  className="h-7 sm:h-8 text-[11px] sm:text-xs border-yellow-500/50 text-yellow-400 bg-black/60 hover:bg-yellow-500/10 flex items-center gap-1 px-2.5 sm:px-3"
                >
                  <Crosshair className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile View Timer (Compact at Top) */}
        {countdownText && countdownText !== 'WAITING' && (
          <div className="md:hidden w-full flex justify-center pointer-events-none">
            <div className="px-3 py-1 bg-black/80 backdrop-blur-md rounded-full border border-cyber-cyan/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan animate-ping" />
              <span className="font-mono font-bold text-white text-xs tracking-wider">
                {countdownText}
              </span>
            </div>
          </div>
        )}

        {/* Desktop Leaderboard Card (Always on right on >= md) */}
        <div className="hidden md:block w-72 lg:w-80 bg-black/85 backdrop-blur-md rounded-xl border border-border/60 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="bg-gradient-to-r from-cyber-purple/30 to-cyber-pink/30 px-3.5 py-2.5 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2 font-outfit font-black text-white text-xs tracking-wider">
              <Trophy className="h-4 w-4 text-yellow-400" /> TOP ORBITING SQUADS
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{teams.length} TEAMS</span>
          </div>

          <div className="max-h-[260px] lg:max-h-[320px] overflow-y-auto divide-y divide-border/20 custom-scrollbar">
            {topTeams.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-muted-foreground">No active orbiting planets yet</div>
            ) : (
              topTeams.map((team, idx) => {
                const isSelected = selectedTeam?.id === team.id;
                return (
                  <div
                    key={team.id}
                    onClick={() => onSelectTeam(team)}
                    className={`flex items-center justify-between px-3.5 py-2 cursor-pointer transition-colors duration-150 font-outfit text-xs ${isSelected ? 'bg-cyber-cyan/20 border-l-2 border-cyber-cyan' : 'hover:bg-white/5'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className={`font-mono font-bold w-4 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: team.color || '#00F0FF', boxShadow: `0 0 6px ${team.color || '#00F0FF'}` }}
                      />
                      <span className="font-bold text-white truncate max-w-[130px]" title={team.name}>
                        {team.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-cyber-cyan shrink-0">
                      {team.score} <span className="text-[9px] text-muted-foreground">PTS</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile Popover Leaderboard Drawer */}
        {showMobileLeaderboard && (
          <div className="md:hidden fixed top-24 left-2.5 right-2.5 bg-black/95 backdrop-blur-lg rounded-xl border border-cyber-cyan/50 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-cyber-purple/40 to-cyber-pink/40 px-3 py-2 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-outfit font-black text-white text-xs tracking-wider">
                <Trophy className="h-3.5 w-3.5 text-yellow-400" /> TOP ORBITING SQUADS
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileLeaderboard(false)}
                className="h-6 w-6 text-muted-foreground hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto divide-y divide-border/20 custom-scrollbar">
              {topTeams.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-muted-foreground">No active orbiting planets yet</div>
              ) : (
                topTeams.map((team, idx) => {
                  const isSelected = selectedTeam?.id === team.id;
                  return (
                    <div
                      key={team.id}
                      onClick={() => {
                        onSelectTeam(team);
                        setShowMobileLeaderboard(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150 font-outfit text-xs ${isSelected ? 'bg-cyber-cyan/20 border-l-2 border-cyber-cyan' : 'hover:bg-white/5'
                        }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`font-mono font-bold w-4 text-center text-xs ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {idx + 1}
                        </span>
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: team.color || '#00F0FF' }}
                        />
                        <span className="font-bold text-white truncate max-w-[150px]">
                          {team.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-cyber-cyan text-xs shrink-0">
                        {team.score} <span className="text-[9px] text-muted-foreground">PTS</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Bottom Bar: Live Attack Feed (>= md) */}
      <div className="hidden md:block mt-auto pointer-events-auto w-full max-w-lg lg:max-w-xl">
        <div className="bg-black/85 backdrop-blur-md rounded-xl border border-border/60 p-3 shadow-[0_0_25px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30 text-[11px] font-outfit font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-cyber-cyan uppercase tracking-wider">
              <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" /> Live Battle Feed
            </span>
          </div>

          <div className="space-y-1.5 max-h-[160px] lg:max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {attackLogs.length === 0 ? (
              <div className="text-center py-3 text-xs font-mono text-muted-foreground/60 italic">
                Waiting for incoming laser strikes...
              </div>
            ) : (
              attackLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between text-xs font-mono px-2.5 py-1 rounded-lg border gap-2 transition-all ${log.isFirstBlood
                    ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                    : log.success
                      ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
                      : 'bg-destructive/10 border-destructive/30 text-destructive/90'
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                    <span className="shrink-0">{log.isFirstBlood ? '👑' : log.success ? '💥' : '🛡️'}</span>
                    <span className="font-bold text-white shrink-0">@{log.teamName}</span>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {log.isFirstBlood ? 'FIRST BLOOD on' : log.success ? 'hit on' : 'missed on'}
                    </span>
                    {log.challengeTitle ? (
                      <span className="font-bold text-foreground truncate bg-white/10 px-1 py-0.5 rounded border border-white/15 text-[10px]" title={log.challengeTitle}>
                        {log.challengeTitle}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-[10px]">Flag</span>
                    )}
                  </div>
                  {log.success && (
                    <span className="font-bold shrink-0 font-outfit text-xs text-primary">
                      +{log.pointsGained}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile Popover Battle Feed Drawer */}
      {showMobileFeed && (
        <div className="md:hidden fixed bottom-4 left-2.5 right-2.5 bg-black/95 backdrop-blur-lg rounded-xl border border-cyber-cyan/50 p-3 shadow-[0_0_35px_rgba(0,0,0,0.9)] z-50 pointer-events-auto animate-in slide-in-from-bottom-5 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30 text-[11px] font-outfit font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-cyber-cyan uppercase tracking-wider">
              <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" /> Live Battle Feed
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileFeed(false)}
              className="h-5 w-5 text-muted-foreground hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
            {attackLogs.length === 0 ? (
              <div className="text-center py-3 text-xs font-mono text-muted-foreground/60 italic">
                Waiting for incoming laser strikes...
              </div>
            ) : (
              attackLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between text-xs font-mono px-2 py-1 rounded-lg border gap-1.5 ${log.isFirstBlood
                    ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-300'
                    : log.success
                      ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
                      : 'bg-destructive/10 border-destructive/30 text-destructive/90'
                    }`}
                >
                  <div className="flex items-center gap-1 truncate min-w-0 flex-1 text-[11px]">
                    <span className="shrink-0">{log.isFirstBlood ? '👑' : log.success ? '💥' : '🛡️'}</span>
                    <span className="font-bold text-white shrink-0">@{log.teamName}</span>
                    <span className="text-muted-foreground truncate">
                      {log.challengeTitle || 'Target'}
                    </span>
                  </div>
                  {log.success && (
                    <span className="font-bold shrink-0 font-outfit text-xs text-primary">
                      +{log.pointsGained}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Desktop Center Bottom: Big Timer (>= md) */}
      {countdownText && countdownText !== 'WAITING' && (
        <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex-col items-center z-40">
          <div className="relative px-6 lg:px-8 py-2.5 lg:py-3 bg-black/40 backdrop-blur-sm border-t border-b border-cyber-cyan/40">
            {/* Tech Corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyber-cyan"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyber-cyan"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyber-cyan"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyber-cyan"></div>

            <span className="font-mono font-black text-white text-xl lg:text-3xl tracking-widest drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
              {countdownText}
            </span>
          </div>
          {/* Decorative Sci-Fi Line */}
          <div className="mt-2.5 flex items-center gap-2 opacity-80">
            <div className="h-[1px] w-6 md:w-16 bg-cyber-cyan/50"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,1)]"></div>
            <div className="h-[1px] w-16 md:w-48 bg-cyber-cyan/80 shadow-[0_0_8px_rgba(0,240,255,0.5)]"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,1)]"></div>
            <div className="h-[1px] w-6 md:w-16 bg-cyber-cyan/50"></div>
          </div>
        </div>
      )}

      {/* SQUAD DETAIL & ANALYTICS MODAL */}
      <TeamDetailModal
        teamId={inspectModalTeamId}
        open={Boolean(inspectModalTeamId)}
        onOpenChange={(open) => !open && setInspectModalTeamId(null)}
      />
    </div>
  );
};
