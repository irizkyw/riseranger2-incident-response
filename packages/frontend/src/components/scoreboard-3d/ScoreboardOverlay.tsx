import React from 'react';
import { Trophy, Shield, Zap, Radio, Table as TableIcon, Rocket, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  countdownText?: string;
}

export const ScoreboardOverlay: React.FC<ScoreboardOverlayProps> = ({
  teams,
  attackLogs,
  onToggleView,
  onSelectTeam,
  selectedTeam,
  onResetCamera,
  countdownText
}) => {
  const topTeams = teams.slice(0, 10);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 overflow-hidden z-20">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-4 pointer-events-auto">
        {/* Left: Branding & Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-cyber-cyan/40 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/60">
              <Rocket className="h-4 w-4 text-cyber-cyan animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-outfit font-black text-white text-base tracking-wide flex items-center gap-1.5">
                  SPACE BATTLE <Badge variant="cyber" className="text-[10px] px-1.5 py-0">LIVE 3D</Badge>
                </h1>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground">REAL-TIME SOLAR CORE ASSAULT ARENA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="cyber"
              size="sm"
              onClick={onToggleView}
              className="h-8 text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <TableIcon className="h-3.5 w-3.5" /> 2D Table View
            </Button>
            {selectedTeam && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetCamera}
                className="h-8 text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-1.5"
              >
                <Crosshair className="h-3.5 w-3.5" /> Reset Camera
              </Button>
            )}
          </div>
        </div>

        {/* Right: Leaderboard Card */}
        <div className="w-72 md:w-80 bg-black/85 backdrop-blur-md rounded-xl border border-border/60 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="bg-gradient-to-r from-cyber-purple/30 to-cyber-pink/30 px-3.5 py-2.5 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2 font-outfit font-black text-white text-xs tracking-wider">
              <Trophy className="h-4 w-4 text-yellow-400" /> TOP ORBITING SQUADS
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{teams.length} TEAMS</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto divide-y divide-border/20 custom-scrollbar">
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
      </div>

      {/* Bottom Bar: Live Attack Feed */}
      <div className="mt-auto pointer-events-auto max-w-lg">
        <div className="bg-black/85 backdrop-blur-md rounded-xl border border-border/60 p-3 shadow-[0_0_25px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30 text-[11px] font-outfit font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-cyber-cyan uppercase tracking-wider">
              <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" /> Live Battle Feed
            </span>
          </div>

          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {attackLogs.length === 0 ? (
              <div className="text-center py-3 text-xs font-mono text-muted-foreground/60 italic">
                Waiting for incoming laser strikes...
              </div>
            ) : (
              attackLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between text-xs font-mono px-2 py-1 rounded border ${log.isFirstBlood
                    ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-300'
                    : log.success
                      ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
                      : 'bg-destructive/10 border-destructive/30 text-destructive/90'
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <span>{log.isFirstBlood ? '👑' : log.success ? '💥' : '🛡️'}</span>
                    <span className="font-bold text-white truncate">{log.teamName}</span>
                    <span className="text-muted-foreground">
                      {log.isFirstBlood ? 'FIRST BLOOD STRIKE!' : log.success ? 'laser hit Boss Core!' : 'laser attack missed!'}
                    </span>
                  </div>
                  {log.success && (
                    <span className="font-bold shrink-0">+{log.pointsGained} PTS</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center Bottom: Big Timer */}
      {countdownText && countdownText !== 'WAITING' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-40">
          <div className="relative px-8 py-3 bg-black/40 backdrop-blur-sm border-t border-b border-cyber-cyan/40">
            {/* Tech Corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyber-cyan"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyber-cyan"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyber-cyan"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyber-cyan"></div>

            <span className="font-mono font-black text-white text-2xl md:text-3xl tracking-widest drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
              {countdownText}
            </span>
          </div>
          {/* Decorative Sci-Fi Line */}
          <div className="mt-3 flex items-center gap-2 opacity-80">
            <div className="h-[1px] w-8 md:w-16 bg-cyber-cyan/50"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,1)]"></div>
            <div className="h-[1px] w-24 md:w-48 bg-cyber-cyan/80 shadow-[0_0_8px_rgba(0,240,255,0.5)]"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,1)]"></div>
            <div className="h-[1px] w-8 md:w-16 bg-cyber-cyan/50"></div>
          </div>
        </div>
      )}
    </div>
  );
};
