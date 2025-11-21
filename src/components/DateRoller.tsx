"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";

interface DateRollerProps {
  onDateSelect: (date: Date) => void;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 3;

const DateRoller = ({ onDateSelect }: DateRollerProps) => {
  const [dates, setDates] = useState<Date[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const futureDates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date;
    });
    setDates(futureDates);
    onDateSelect(futureDates[0]);
  }, [onDateSelect]);

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.y;
    const newIndex = Math.round((y.get() - offset) / -ITEM_HEIGHT);

    const newSelectedIndex = Math.max(0, Math.min(dates.length - 1, newIndex));
    setSelectedIndex(newSelectedIndex);
    onDateSelect(dates[newSelectedIndex]);
    triggerHaptic();

    animate(y, -newSelectedIndex * ITEM_HEIGHT, {
      type: "spring",
      stiffness: 400,
      damping: 30,
    });
  };

  return (
    <div
      ref={containerRef}
      className="h-48 relative flex items-center justify-center overflow-hidden"
      data-vaul-no-drag
    >
      <motion.div
        drag="y"
        dragConstraints={{
          top: -ITEM_HEIGHT * (dates.length - 1),
          bottom: 0,
        }}
        style={{ y }}
        onDragEnd={handleDragEnd}
        className="flex flex-col items-center"
      >
        <div style={{ height: (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT }} />
        {dates.map((date, index) => (
          <motion.div
            key={index}
            className="h-12 flex items-center justify-center text-base font-medium"
            style={{
              height: ITEM_HEIGHT,
              fontWeight: index === selectedIndex ? "bold" : "normal",
            }}
          >
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </motion.div>
        ))}
        <div style={{ height: (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT }} />
      </motion.div>
    </div>
  );
};

export default DateRoller;
