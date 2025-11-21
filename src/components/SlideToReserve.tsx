"use client";

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

const SlideToReserve = ({ onSlide, variant = "reserve" }: { onSlide: () => Promise<boolean>, variant?: "reserve" | "confirm" }) => {
  const x = useMotionValue(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const background = useTransform(
    x,
    [0, 100],
    ['#4f46e5', '#34d399']
  );

  const handleSlide = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    console.log("SlideToReserve: onSlide triggered");
    const success = await onSlide();
    
    if (!success) {
      // If failed, reset the slider
      x.set(0);
    }
    // On success, the slider will stay at the end. The parent component is responsible for unmounting it.
    setIsProcessing(false);
  };

  return (
    <motion.div
      className="relative w-full h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
      style={{ background }}
    >
      <motion.div
        className="absolute left-2 w-12 h-12 bg-white rounded-full flex items-center justify-center"
        drag="x"
        dragConstraints={{ left: 0, right: 200 }}
        style={{ x }}
        onDragEnd={async (_, info) => {
          if (info.offset.x > 150) {
            triggerHaptic();
            x.set(200); // Keep the slider at the end
            await handleSlide();
          } else {
            x.set(0);
          }
        }}
      >
        <ChevronRight className="text-indigo-500" />
      </motion.div>
      <span>{isProcessing ? "Processing..." : (variant === "reserve" ? "Slide to reserve" : "Slide to confirm")}</span>
    </motion.div>
  );
};

export default SlideToReserve;
