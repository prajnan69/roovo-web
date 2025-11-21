"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { triggerHaptic } from "@/lib/haptics";

interface WheelPickerProps {
  data: string[];
  onChange: (value: string) => void;
  initialValue?: string;
}

const ITEM_HEIGHT = 48; // h-12
const VISIBLE_ITEMS = 5; // odd number recommended
const PADDING = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

export default function WheelPicker({
  data,
  onChange,
  initialValue,
}: WheelPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const initialIndex = initialValue ? data.indexOf(initialValue) : 0;
    return initialIndex > -1 ? initialIndex : 0;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const newIndex = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);

    if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < data.length) {
      setSelectedIndex(newIndex);
      onChange(data[newIndex]);
      triggerHaptic();
    }
  }, [selectedIndex, data, onChange]);

  return (
    <div className="relative select-none">
      {/* Center Highlight Window */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 border-y border-gray-400"
        style={{
          top: `calc(50% - ${ITEM_HEIGHT / 2}px)`,
          height: ITEM_HEIGHT,
        }}
      />

      {/* Scrollable list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-scroll snap-y snap-mandatory"
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          paddingTop: PADDING,
          paddingBottom: PADDING,
        }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-center h-12 snap-center transition-all ${
              selectedIndex === index ? "text-lg font-bold" : "text-md opacity-60"
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
