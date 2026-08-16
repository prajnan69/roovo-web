"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { infinityPath } from './RoovoLogoNew';

type Phase = 'draw' | 'hold' | 'out';

const SplashScreen: React.FC<{
  onAnimationComplete: () => void;
  otaState?: 'idle' | 'downloading' | 'updated';
  /** True once the OTA check finished without scheduling a reload. The splash
   *  holds until then — otherwise it fades out while the check is still in
   *  flight and the user stares at a blank screen until otaDone unblocks App.
   *  Stays false when a reload is coming; the WebView restart replaces us. */
  otaDone?: boolean;
}> = ({ onAnimationComplete, otaState = 'idle', otaDone = true }) => {
  const [phase, setPhase] = useState<Phase>('draw');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Always advance to 'hold' so the logo solidifies and OTA indicator is visible.
    const t1 = setTimeout(() => setPhase('hold'), 900);
    // Minimum time the logo stays on screen before we're allowed to exit.
    const t2 = setTimeout(() => setMinTimeElapsed(true), 1800);
    return () => [t1, t2].forEach(clearTimeout);
  }, []);

  // Exit only when the minimum animation time has run AND the OTA check is done.
  useEffect(() => {
    if (!minTimeElapsed || !otaDone) return;
    setPhase('out');
    const t = setTimeout(onAnimationComplete, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTimeElapsed, otaDone]);

  return (
    <AnimatePresence>
      {phase !== 'out' && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <svg width="140" height="68" viewBox="350 50 800 380" xmlns="http://www.w3.org/2000/svg">
            {/* Stroke that draws itself in */}
            <motion.path
              d={infinityPath}
              fill="none"
              stroke="#111827"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={
                phase === 'draw'
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 1, opacity: 0 }
              }
              transition={
                phase === 'draw'
                  ? { pathLength: { duration: 0.75, ease: [0.4, 0, 0.2, 1] } }
                  : { opacity: { duration: 0.2 } }
              }
            />
            {/* Solid fill that crossfades in */}
            <motion.path
              d={infinityPath}
              fill="#111827"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'hold' ? 1 : 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </svg>

          <motion.p
            className="mt-5 text-neutral-900 tracking-[0.35em] text-sm font-light uppercase"
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: phase === 'hold' ? 1 : 0,
              y: phase === 'hold' ? 0 : 6,
            }}
            transition={{ duration: 0.3, delay: 0.08, ease: 'easeOut' }}
          >
            roovo
          </motion.p>

          {/* OTA indicator — each state animates in/out instead of hard-swapping */}
          <div style={{ position: 'absolute', bottom: 48, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              {otaState === 'downloading' && (
                <motion.div
                  key="downloading"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.08em', fontWeight: 500 }}>
                    Updating
                  </span>
                </motion.div>
              )}
              {otaState === 'updated' && (
                <motion.div
                  key="updated"
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 11, color: '#22c55e', letterSpacing: '0.08em', fontWeight: 500 }}>
                    Updated
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
