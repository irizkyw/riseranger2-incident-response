import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake } from 'lucide-react';
import audioSfx from '@/utils/audioSfx';

interface FreezeScreenOverlayProps {
  isFrozen: boolean;
}

export const FreezeScreenOverlay: React.FC<FreezeScreenOverlayProps> = ({ isFrozen }) => {
  const [flurries, setFlurries] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number; opacity: number }>>([]);
  const [showThawEffect, setShowThawEffect] = useState(false);
  const wasFrozenRef = useRef(false);

  useEffect(() => {
    if (isFrozen) {
      wasFrozenRef.current = true;
      audioSfx.playFreezeSound();
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
      if (wasFrozenRef.current) {
        audioSfx.playUnfreezeSound();
        setShowThawEffect(true);
        wasFrozenRef.current = false;
        const timer = setTimeout(() => setShowThawEffect(false), 2400);
        return () => clearTimeout(timer);
      }
    }
  }, [isFrozen]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none">
      {/* 1. FROZEN SCREEN OVERLAY (Smooth entrance & exit with AnimatePresence) */}
      <AnimatePresence mode="wait">
        {isFrozen && (
          <motion.div
            key="frozen-overlay"
            initial={{ opacity: 0, scale: 1.04, filter: 'brightness(1.3)' }}
            animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
            exit={{
              opacity: 0,
              scale: 1.06,
              filter: 'blur(6px)',
              transition: { duration: 1.2, ease: [0.25, 1, 0.5, 1] }
            }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Cinematic Freeze Shockwave Pulse on arrival */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{
                scale: [0.7, 1.4, 1.8],
                opacity: [0, 0.6, 0]
              }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute inset-0 m-auto w-[100vw] h-[100vh] bg-radial from-cyan-300/35 via-cyan-500/15 to-transparent rounded-full blur-2xl pointer-events-none"
            />

            {/* Cold Atmospheric Blue Haze Vignette */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 bg-gradient-to-b from-cyan-950/35 via-transparent to-cyan-950/45"
              style={{
                boxShadow: 'inset 0 0 160px rgba(56, 189, 248, 0.4), inset 0 0 70px rgba(186, 230, 253, 0.3)'
              }}
            />

            {/* Frosted Ice Crystal Screen Edges & Corners */}
            <motion.div
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 0.95, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              {/* Top Edge Frost */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-cyan-400/35 via-cyan-300/15 to-transparent backdrop-blur-[1.5px]" />

              {/* Bottom Edge Frost */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cyan-400/40 via-cyan-300/20 to-transparent backdrop-blur-[1.5px]" />

              {/* Left Edge Frost */}
              <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-cyan-400/35 to-transparent" />

              {/* Right Edge Frost */}
              <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-cyan-400/35 to-transparent" />

              {/* Top-Left Corner Crystals */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-radial from-cyan-300/45 via-cyan-500/20 to-transparent rounded-br-full" />

              {/* Top-Right Corner Crystals */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-cyan-300/45 via-cyan-500/20 to-transparent rounded-bl-full" />

              {/* Bottom-Left Corner Crystals */}
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-radial from-cyan-300/45 via-cyan-500/20 to-transparent rounded-tr-full" />

              {/* Bottom-Right Corner Crystals */}
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-radial from-cyan-300/45 via-cyan-500/20 to-transparent rounded-tl-full" />
            </motion.div>

            {/* Floating 2D Snow / Ice Flurries */}
            {flurries.map((f) => (
              <motion.div
                key={f.id}
                initial={{ y: -20, opacity: 0, x: `${f.left}vw` }}
                animate={{
                  y: '105vh',
                  opacity: [0, f.opacity, f.opacity, 0],
                  x: [`${f.left}vw`, `${f.left + (Math.random() * 5 - 2.5)}vw`]
                }}
                exit={{
                  opacity: 0,
                  scale: 0,
                  transition: { duration: 0.6 }
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. REAL-TIME UNFREEZING / THAWING TRANSITION WAVE (Plays automatically when unfrozen) */}
      <AnimatePresence>
        {showThawEffect && (
          <motion.div
            key="thaw-ripple"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Warm Solar Radial Beam expanding outward */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                scale: [0.6, 1.6, 2.2],
                opacity: [0, 0.45, 0]
              }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="absolute inset-0 m-auto w-[120vw] h-[120vh] -left-[10vw] -top-[10vh] bg-radial from-amber-400/30 via-yellow-500/15 to-transparent rounded-full blur-2xl"
            />

            {/* Glowing Golden Horizontal Scanline sweep */}
            <motion.div
              initial={{ y: '-10%', opacity: 0 }}
              animate={{
                y: ['-10%', '110%'],
                opacity: [0, 0.6, 0]
              }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-amber-400/25 to-transparent blur-md"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
