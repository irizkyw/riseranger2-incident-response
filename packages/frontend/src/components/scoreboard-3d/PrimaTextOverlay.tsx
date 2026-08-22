import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Crown, Flame, Target, ShieldCheck, Crosshair, Zap, Radio } from 'lucide-react';

interface PrimaTextOverlayProps {
  id?: string;
  visible: boolean;
  teamName?: string;
  pointsGained?: number;
  isFirstBlood?: boolean;
  onAnimationComplete?: () => void;
}

export const PrimaTextOverlay: React.FC<PrimaTextOverlayProps> = ({
  id,
  visible,
  teamName,
  pointsGained,
  isFirstBlood = false,
  onAnimationComplete
}) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setAnimating(false);
    }
  }, [visible, id, onAnimationComplete]);

  if (!visible && !animating) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none font-mono">
      {/* Container with CSS float-up and fade-out animation */}
      <div className="relative flex flex-col items-center animate-prima-float-up w-full max-w-4xl px-4">

        {/* Anamorphic Tactical Laser Target Beam */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-[95vw] max-w-5xl opacity-90 pointer-events-none transition-all duration-500",
            isFirstBlood
              ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_25px_rgba(245,158,11,1)]"
              : "bg-gradient-to-r from-transparent via-cyber-cyan to-transparent shadow-[0_0_25px_rgba(0,240,255,1)]"
          )}
        />

        {/* SPACE ARMY MODERN TACTICAL HUD BANNER */}
        <div
          className={cn(
            "relative flex flex-col items-center w-full py-6 sm:py-8 px-6 sm:px-12 rounded-xl backdrop-blur-2xl bg-slate-950/85 border shadow-[0_15px_60px_rgba(0,0,0,0.95)] overflow-hidden transition-all duration-300",
            isFirstBlood
              ? "border-amber-500/70 shadow-[0_0_50px_rgba(245,158,11,0.35)] bg-gradient-to-r from-amber-950/50 via-slate-950/90 to-amber-950/50"
              : "border-cyber-cyan/70 shadow-[0_0_50px_rgba(0,240,255,0.3)] bg-gradient-to-r from-cyan-950/50 via-slate-950/90 to-cyan-950/50"
          )}
        >
          {/* Tactical Crosshair Corner Reticles */}
          <div className="absolute top-2 left-2 flex items-center gap-1 text-[9px] text-muted-foreground/80 font-mono">
            <Crosshair className={cn("h-3.5 w-3.5", isFirstBlood ? "text-amber-400" : "text-cyber-cyan")} />
            <span>GRID // ORBIT-01</span>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-muted-foreground/80 font-mono">
            <span>STATUS // ENGAGED</span>
            <Target className={cn("h-3.5 w-3.5", isFirstBlood ? "text-amber-400" : "text-cyber-cyan")} />
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-muted-foreground/60 font-mono">
            <span>SYS.VER // 2.6-ACT</span>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] text-muted-foreground/60 font-mono">
            <span>SPACE CORPS HQ</span>
          </div>

          {/* Tactical HUD Header Scanline Bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 animate-pulse" />

          {/* Modern Space Army Header Badge */}
          <div className="flex items-center gap-2 mt-2 mb-2 font-mono font-black text-xs sm:text-sm tracking-[0.25em] uppercase">
            {isFirstBlood ? (
              <div className="flex items-center gap-2 text-amber-300 bg-amber-500/25 px-4 py-1 rounded border border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                <Crown className="h-4 w-4 text-amber-300 animate-bounce" />
                <span>SPACE CORPS // FIRST BLOOD</span>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-cyber-cyan bg-cyber-cyan/25 px-4 py-1 rounded border border-cyber-cyan/80 shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                <Zap className="h-4 w-4 text-cyber-pink animate-pulse" />
                <span>ORBITAL TACTICAL STRIKE</span>
                <span className="h-2 w-2 rounded-full bg-cyber-cyan animate-ping" />
              </div>
            )}
          </div>

          {/* MAIN BIG PRIMA MILITARY STENCIL TYPOGRAPHY */}
          <div className="relative flex items-center justify-center my-2 select-none">
            <h1
              className={cn(
                "font-outfit font-black text-7xl sm:text-9xl tracking-[0.18em] uppercase transition-all duration-300",
                isFirstBlood
                  ? "bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(245,158,11,0.95)]"
                  : "bg-gradient-to-b from-white via-cyber-cyan to-cyber-purple bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(0,240,255,0.95)]"
              )}
              style={{
                WebkitTextStroke: isFirstBlood ? "3px rgba(251, 191, 36, 0.95)" : "3px rgba(0, 240, 255, 0.9)",
                fontFamily: "Outfit, system-ui, sans-serif",
              }}
            >
              PRIMA!
            </h1>
          </div>

          {/* Squad & Combat Points Telemetry Badge */}
          {teamName && (
            <div className="mt-1 mb-2 flex flex-wrap items-center justify-center gap-3 font-mono text-xs sm:text-sm font-bold text-white tracking-widest bg-black/80 px-6 py-2 rounded-md border border-white/20 shadow-lg">
              <span className="text-muted-foreground uppercase text-[11px]">SQUAD OPERATIVE:</span>
              <span className="text-amber-300 font-extrabold drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]">
                @{teamName}
              </span>
              {pointsGained !== undefined && pointsGained > 0 && (
                <span className="text-cyber-green font-extrabold bg-cyber-green/20 px-3 py-0.5 rounded border border-cyber-green/60 text-xs shadow-[0_0_15px_rgba(0,255,102,0.5)]">
                  +{pointsGained} PTS
                </span>
              )}
            </div>
          )}

          {/* Tactical Military HUD Line */}
          <div className="mt-2 flex items-center gap-3 w-64 opacity-70">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/60" />
            <span className="text-[9px] text-white/80 font-mono tracking-widest">{"\u00BB\u00BB\u00BB C.O.M.B.A.T \u00AB\u00AB\u00AB"}</span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/60" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrimaTextOverlay;
