import React, { useEffect, useState, useRef } from 'react';
import audioSfx from '@/utils/audioSfx';

interface FreezeScreenOverlayProps {
  isFrozen: boolean;
}

export const FreezeScreenOverlay: React.FC<FreezeScreenOverlayProps> = ({ isFrozen }) => {
  const [showThawEffect, setShowThawEffect] = useState(false);
  const wasFrozenRef = useRef(false);

  useEffect(() => {
    if (isFrozen) {
      wasFrozenRef.current = true;
      audioSfx.playFreezeSound();
    } else {
      if (wasFrozenRef.current) {
        audioSfx.playUnfreezeSound();
        setShowThawEffect(true);
        wasFrozenRef.current = false;
        const timer = setTimeout(() => setShowThawEffect(false), 1600);
        return () => clearTimeout(timer);
      }
    }
  }, [isFrozen]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none">
      {/* 1. FROZEN SCREEN OVERLAY (Smooth GPU Opacity Transition) */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-out will-change-[opacity] ${
          isFrozen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Cold Atmospheric Blue Haze Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/40 via-transparent to-cyan-950/50" />

        {/* Top Edge Frost */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-cyan-400/35 via-cyan-300/10 to-transparent" />

        {/* Bottom Edge Frost */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-cyan-400/40 via-cyan-300/15 to-transparent" />

        {/* Left Edge Frost */}
        <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-cyan-400/30 to-transparent" />

        {/* Right Edge Frost */}
        <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-cyan-400/30 to-transparent" />

        {/* Corner Ice Crystal Accents */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-radial from-cyan-300/40 via-cyan-500/10 to-transparent rounded-br-full" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-cyan-300/40 via-cyan-500/10 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-radial from-cyan-300/40 via-cyan-500/10 to-transparent rounded-tr-full" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-radial from-cyan-300/40 via-cyan-500/10 to-transparent rounded-tl-full" />
      </div>

      {/* 2. THAWING / UNFREEZING WARMTH FLASH */}
      {showThawEffect && (
        <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
          {/* Warm Solar Radial Beam */}
          <div className="absolute inset-0 bg-radial from-amber-400/25 via-yellow-500/10 to-transparent rounded-full" />
          {/* Golden Horizontal Scanline Sweep */}
          <div className="absolute left-0 right-0 h-28 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent animate-pulse" />
        </div>
      )}
    </div>
  );
};

