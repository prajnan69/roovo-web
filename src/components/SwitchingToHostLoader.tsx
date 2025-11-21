"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RotatingText from "./RotatingText";
import RoovoLogo from "./RoovoLogo";

interface LoaderProps {
  onAnimationComplete: () => void;
  onTransitionStart: () => void;
  to: "host" | "traveling";
}

const SwitchingToHostLoader = ({ onAnimationComplete, onTransitionStart, to }: LoaderProps) => {
  const [toHost, setToHost] = useState(false);

  useEffect(() => {
    const transitionTimer = setTimeout(() => {
      setToHost(true);
      onTransitionStart();
    }, 1400);

    const completeTimer = setTimeout(() => {
      onAnimationComplete();
    }, 3000);

    return () => {
      clearTimeout(transitionTimer);
      clearTimeout(completeTimer);
    };
  }, [onAnimationComplete, onTransitionStart]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      <div className="relative flex items-center justify-center w-80 h-80 overflow-visible">
        {/* 🌍 Static Globe */}
        <div className="absolute bottom-0">
          <img src="/icons/globe_t.png" alt="Globe" width={250} height={250} />
        </div>

        {/* 🧍Man */}
      <AnimatePresence mode="sync">
        {!toHost ? (
          <motion.div
            key="man_t"
            initial={{ opacity: 1, rotate: 0 }} // Starts visible, no rotation
            exit={{ rotate: -180, opacity: 0 }} // Rotates away and fades
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute bottom-28"
            style={{ transformOrigin: "bottom center" }}
          >
            <img
              src="/icons/man_t.png"
              alt="Character"
              width={230}
              height={230}
            />
          </motion.div>
        ) : (
          <motion.div
            key="man_h"
            initial={{ rotate: 180, opacity: 0 }} // Enters from top, faded
            animate={{ rotate: 0, opacity: 1 }} // Rotates to upright and fades in
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute bottom-28"
            style={{ transformOrigin: "bottom center" }}
          >
            <img
              src="/icons/man_h.png"
              alt="Character"
              width={230}
              height={230}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <div className="absolute bottom-1/4 text-center flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="h-8 w-auto"
        >
          <RoovoLogo height="100%" width="auto" />
        </motion.div>
        
        <div className="h-8 w-px bg-gray-200 mx-1" />

        <AnimatePresence mode="wait">
          <motion.div
            key={toHost ? "hosting" : "traveling"}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <RotatingText
              texts={toHost ? ["Hosting"] : ["Traveling"]}
              mainClassName="text-2xl font-medium text-gray-600 tracking-wide"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SwitchingToHostLoader;
