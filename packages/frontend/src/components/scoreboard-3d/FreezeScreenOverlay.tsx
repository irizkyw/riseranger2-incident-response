import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Snowflake } from 'lucide-react';

interface FreezeScreenOverlayProps {
  isFrozen: boolean;
}

export const FreezeScreenOverlay: React.FC<FreezeScreenOverlayProps> = ({ isFrozen }) => {
  const [flurries, setFlurries] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number; opacity: number }>>([]);

  useEffect(() => {
    if (isFrozen) {
      // Generate 35 floating 2D frost snowflakes & ice dust crystals
      const items = Array.from({ length: 35 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 9 + 4,
        duration: Math.random() * 7 + 4,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.75 + 0.25
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
          boxShadow: 'inset 0 0 120px rgba(56, 189, 248, 0.3), inset 0 0 50px rgba(186, 230, 253, 0.25)'
        }}
      />

      {/* 2. Frosted Ice Crystal Screen Edges & Corners */}
      <div className="absolute inset-0 opacity-85">
        {/* Top Edge Frost */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-cyan-400/25 via-cyan-300/10 to-transparent backdrop-blur-[1px]" />

        {/* Bottom Edge Frost */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-cyan-400/30 via-cyan-300/15 to-transparent backdrop-blur-[1px]" />

        {/* Left Edge Frost */}
        <div className="absolute top-0 bottom-0 left-0 w-14 bg-gradient-to-r from-cyan-400/25 to-transparent" />

        {/* Right Edge Frost */}
        <div className="absolute top-0 bottom-0 right-0 w-14 bg-gradient-to-l from-cyan-400/25 to-transparent" />

        {/* Top-Left Corner Crystals */}
        <div className="absolute top-0 left-0 w-56 h-56 bg-radial from-cyan-300/35 via-cyan-500/15 to-transparent rounded-br-full" />

        {/* Top-Right Corner Crystals */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-radial from-cyan-300/35 via-cyan-500/15 to-transparent rounded-bl-full" />

        {/* Bottom-Left Corner Crystals */}
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-radial from-cyan-300/35 via-cyan-500/15 to-transparent rounded-tr-full" />

        {/* Bottom-Right Corner Crystals */}
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-radial from-cyan-300/35 via-cyan-500/15 to-transparent rounded-tl-full" />
      </div>

      {/* 3. Floating 2D Snow / Ice Flurries */}
      {flurries.map((f) => (
        <motion.div
          key={f.id}
          initial={{ y: -20, opacity: 0, x: `${f.left}vw` }}
          animate={{
            y: '105vh',
            opacity: [0, f.opacity, f.opacity, 0],
            x: [`${f.left}vw`, `${f.left + (Math.random() * 5 - 2.5)}vw`]
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
          <Snowflake className="w-full h-full drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
        </motion.div>
      ))}
    </div>
  );
};
