"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { ChevronRight, Check, Loader2 } from 'lucide-react';
import { triggerHaptic, triggerErrorHaptic } from '@/lib/haptics';

const SlideToReserve = ({ onSlide, variant = "reserve", text }: { onSlide: () => Promise<boolean>, variant?: "reserve" | "confirm", text?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragBounds, setDragBounds] = useState(0);
  const x = useMotionValue(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        // Container width - thumb width (52) - horizontal padding (6 * 2)
        setDragBounds(containerRef.current.offsetWidth - 52 - 12);
      }
    };
    updateBounds();
    // Re-verify bounds if window resizes
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, []);

  const handleSlide = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    triggerHaptic(20);

    const success = await onSlide();

    if (success) {
      setIsSuccess(true);
      triggerHaptic(40);
    } else {
      triggerErrorHaptic();
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    }
    setIsProcessing(false);
  };

  // Fluid UI Transforms
  const textOpacity = useTransform(x, [0, Math.max(dragBounds * 0.4, 1)], [1, 0]);
  const activeTrackWidth = useTransform(x, [0, Math.max(dragBounds, 1)], [52, dragBounds + 52]);
  const textTranslateX = useTransform(x, [0, Math.max(dragBounds, 1)], [0, 15]);

  // Smooth color gradient from Indigo to Emerald based on drag
  const activeBgColor = useTransform(
    x,
    [0, Math.max(dragBounds, 1)],
    ['#4f46e5', '#10b981'] // Indigo-600 -> Emerald-500
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[64px] rounded-full flex items-center p-1.5 overflow-hidden transition-colors duration-500 ${isSuccess ? 'bg-emerald-500' : 'bg-slate-100 shadow-inner'
        }`}
    >
      {/* Sliding Color Track */}
      {!isSuccess && dragBounds > 0 && (
        <motion.div
          className="absolute left-1.5 top-1.5 bottom-1.5 rounded-full z-0 shadow-sm"
          style={{
            width: activeTrackWidth,
            backgroundColor: activeBgColor,
          }}
        />
      )}

      {/* Guide Text */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: textOpacity, x: textTranslateX }}
      >
        <span className="font-bold text-[15px] tracking-wide text-slate-400 mix-blend-multiply">
          {text ? text : (variant === "reserve" ? "Slide to reserve" : "Slide to confirm")}
        </span>
      </motion.div>

      {/* Draggable Handle */}
      <motion.div
        drag={!isProcessing && !isSuccess && dragBounds > 0 ? "x" : false}
        dragConstraints={{ left: 0, right: dragBounds }}
        dragElastic={0.03}
        dragMomentum={false}
        style={{ x }}
        animate={controls}
        onDragStart={() => {
          triggerHaptic(10);
        }}
        onDragEnd={async (_) => {
          if (x.get() > dragBounds * 0.75) {
            // Snap to end and trigger action
            controls.start({ x: dragBounds, transition: { type: "spring", stiffness: 350, damping: 25 } });
            await handleSlide();
          } else {
            // Snap back
            triggerHaptic(10);
            controls.start({ x: 0, transition: { type: "spring", stiffness: 450, damping: 25 } });
          }
        }}
        className={`relative z-20 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-colors duration-300 ${isSuccess
          ? 'bg-white text-emerald-500 scale-105'
          : 'bg-white text-indigo-600 cursor-grab active:cursor-grabbing hover:scale-[1.02]'
          }`}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        ) : isSuccess ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
            <Check className="w-6 h-6" strokeWidth={3} />
          </motion.div>
        ) : (
          <ChevronRight className="w-6 h-6 ml-0.5 opacity-90" strokeWidth={2.5} />
        )}
      </motion.div>
    </div>
  );
};

export default SlideToReserve;
