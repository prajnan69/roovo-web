"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { infinityPath } from './RoovoLogoNew';

type Phase = 'draw' | 'hold' | 'out';

const SplashScreen: React.FC<{
  onAnimationComplete: () => void;
  otaState?: 'idle' | 'downloading' | 'updated';
}> = ({ onAnimationComplete, otaState = 'idle' }) => {
  const [phase, setPhase] = useState<Phase>('draw');
  // Track whether an OTA update is in flight so we never auto-exit the splash.
  // When otaState is 'downloading' or 'updated', the WebView will be reloaded
  // by LiveUpdate — so the splash must stay visible until that hard restart.
  const otaActive = otaState === 'downloading' || otaState === 'updated';
  const otaActiveRef = useRef(otaActive);
  otaActiveRef.current = otaActive;

  useEffect(() => {
    // Always advance to 'hold' so the logo solidifies and OTA indicator is visible.
    const t1 = setTimeout(() => setPhase('hold'), 900);

    // Only schedule exit when there is NO OTA update.
    // If OTA kicks in after t1 but before t2/t3, we guard with the ref.
    const t2 = setTimeout(() => {
      if (!otaActiveRef.current) setPhase('out');
    }, 1800);

    const t3 = setTimeout(() => {
      if (!otaActiveRef.current) onAnimationComplete();
    }, 2150);

    return () => [t1, t2, t3].forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // If OTA was in flight and now finishes with 'idle' (no update needed path
  // — should not happen, but safety valve), allow exit.
  useEffect(() => {
    if (otaState === 'idle' && phase === 'hold') {
      // Already past the natural exit window — fire it now.
      const t = setTimeout(() => {
        setPhase('out');
        setTimeout(onAnimationComplete, 350);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [otaState]); // eslint-disable-line react-hooks/exhaustive-deps

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

          {/* OTA indicator */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: otaState !== 'idle' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {otaState === 'downloading' ? (
              <>
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
              </>
            ) : otaState === 'updated' ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 11, color: '#22c55e', letterSpacing: '0.08em', fontWeight: 500 }}>
                  Updated
                </span>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
