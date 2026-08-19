import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake, Lock, ShieldAlert } from 'lucide-react';

interface FreezeScreenOverlayProps {
  isFrozen: boolean;
}

export const FreezeScreenOverlay: React.FC<FreezeScreenOverlayProps> = ({ isFrozen }) => {
  const [flurries, setFlurries] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number; opacity: number }>>([]);

  useEffect(() => {
    if (isFrozen) {
      // Generate 25 floating 2D frost snowflakes
      const items = Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 8 + 4,
        duration: Math.random() * 6 + 4,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.7 + 0.3
      }));
      setFlurries(items);
    } else {
      setFlurries([]);
    }
  }, [isFrozen]);

  if (!isFrozen) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
      {/* 1. Cold Atmospheric Blue Haze Vignette */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-cyan-950/30"
        style={{
          boxShadow: 'inset 0 0 100px rgba(56, 189, 248, 0.25), inset 0 0 40px rgba(186, 230, 253, 0.2)'
        }}
      />

      {/* 2. Frosted Ice Crystal Screen Edges & Corners */}
      <div className="absolute inset-0 opacity-80">
        {/* Top Edge Frost */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-cyan-400/20 via-cyan-300/5 to-transparent backdrop-blur-[1px]" />

        {/* Bottom Edge Frost */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cyan-400/25 via-cyan-300/10 to-transparent backdrop-blur-[1px]" />

        {/* Left Edge Frost */}
        <div className="absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-cyan-400/20 to-transparent" />

        {/* Right Edge Frost */}
        <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-cyan-400/20 to-transparent" />

        {/* Top-Left Corner Crystals */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-radial from-cyan-300/30 via-cyan-500/10 to-transparent rounded-br-full" />

        {/* Top-Right Corner Crystals */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-radial from-cyan-300/30 via-cyan-500/10 to-transparent rounded-bl-full" />

        {/* Bottom-Left Corner Crystals */}
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-radial from-cyan-300/30 via-cyan-500/10 to-transparent rounded-tr-full" />

        {/* Bottom-Right Corner Crystals */}
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-radial from-cyan-300/30 via-cyan-500/10 to-transparent rounded-tl-full" />
      </div>

      {/* 3. Floating 2D Snow / Ice Flurries */}
      {flurries.map((f) => (
        <motion.div
          key={f.id}
          initial={{ y: -20, opacity: 0, x: `${f.left}vw` }}
          animate={{
            y: '105vh',
            opacity: [0, f.opacity, f.opacity, 0],
            x: [`${f.left}vw`, `${f.left + (Math.random() * 4 - 2)}vw`]
          }}
          transition={{
            duration: f.duration,
            repeat: Infinity,
            delay: f.delay,
            ease: 'linear'
          }}
          className="absolute text-cyan-200"
          style={{ width: f.size, height: f.size }}
        >
          <Snowflake className="w-full h-full drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        </motion.div>
      ))}

      {/* 4. Top Cold Frost Status Banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-30 pointer-events-auto">
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/60 shadow-[0_0_25px_rgba(56,189,248,0.4)] backdrop-blur-md"
        >
          <Snowflake className="h-4 w-4 text-cyan-300 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-outfit font-black text-xs sm:text-sm uppercase tracking-wider text-cyan-100 flex items-center gap-1.5">
            <span>SCOREBOARD FROZEN</span>
          </span>
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        </motion.div>
        <span className="text-[10px] font-mono text-cyan-200/90 font-medium bg-black/60 px-2.5 py-0.5 rounded-md border border-cyan-500/20 backdrop-blur-sm">
          Poin publik terkunci • Tantangan & Hint tetap dapat dikerjakan
        </span>
      </div>
    </div>
  );
};
