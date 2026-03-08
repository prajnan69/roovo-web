"use client";

import { useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import RoovoLoader from "../RoovoLoader";
import { triggerHaptic } from "@/lib/haptics";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  guest_id: string;
}

interface CalendarGridProps {
  currentDate: Date;
  bookings: Booking[];
  isLoading: boolean;
  direction: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  priceMap?: Record<string, number>;
  selectedDates?: string[];
  onToggleDate?: (date: string) => void;
  onRangeSelect?: (dates: string[]) => void;
  onBookingClick?: (booking: Booking) => void;
}

const CalendarGrid = ({
  currentDate,
  bookings,
  isLoading,
  direction,
  onPreviousMonth,
  onNextMonth,
  priceMap = {},
  selectedDates = [],
  onToggleDate,
  onRangeSelect,
  onBookingClick
}: CalendarGridProps) => {
  const isDragging = useRef(false);
  const dragStartDate = useRef<string | null>(null);
  const currentRange = useRef<Set<string>>(new Set());



  const calculateRange = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const range: string[] = [];
    const low = d1 < d2 ? d1 : d2;
    const high = d1 < d2 ? d2 : d1;

    for (let d = new Date(low); d <= high; d.setDate(d.getDate() + 1)) {
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      range.push(localDate.toISOString().split('T')[0]);
    }
    return range;
  };

  const handlePointerDown = (dateStr: string) => {
    isDragging.current = true;
    dragStartDate.current = dateStr;
    currentRange.current.clear();
    currentRange.current.add(dateStr);

    // Select the initial date immediately
    if (onToggleDate) {
      triggerHaptic();
      onToggleDate(dateStr);
    }

    // Capture pointer to track movement outside the element if needed
    // (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerEnter = (dateStr: string) => {
    if (isDragging.current && dragStartDate.current) {
      const range = calculateRange(dragStartDate.current, dateStr);
      // Only trigger update if range changed significantly? 
      // Actually, passing the whole range to parent is safest
      if (onRangeSelect) {
        // Debounce or check?
        // Ideally we just fire it. Framer motion layoutId might be heavy
        // triggerHaptic(); // Maybe too many haptics?
        onRangeSelect(range);
      }
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    dragStartDate.current = null;
    currentRange.current.clear();
  };


  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const variants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "circOut" },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      transition: { duration: 0.3, ease: "circIn" },
    }),
  };

  const handlePrev = async () => {
    await triggerHaptic();
    onPreviousMonth();
  };

  const handleNext = async () => {
    await triggerHaptic();
    onNextMonth();
  };

  return (
    <div
      className="px-3 pb-20 overflow-hidden touch-pan-y"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Weekdays Header - Matching Original */}
      <div className="grid grid-cols-7 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentDate.toString()}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="grid grid-cols-7 gap-2"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, { offset, velocity }) => {
            // Swipe Logic
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -10000) handleNext();
            else if (swipe > 10000) handlePrev();
          }}
        >
          {/* Empty Slots */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {isLoading ? (
            <div className="col-span-7 flex justify-center py-12">
              <RoovoLoader className="w-12 h-12" />
            </div>
          ) : (
            Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              );

              // Format: YYYY-MM-DD
              const offset = date.getTimezoneOffset();
              const localDate = new Date(date.getTime() - (offset * 60 * 1000));
              const dateStr = localDate.toISOString().split("T")[0];

              const booking = bookings.find((b) => {
                return dateStr >= b.start_date && dateStr < b.end_date;
              });

              // --- ORIGINAL STYLING LOGIC START ---
              const isToday = new Date().toDateString() === date.toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              const isSelected = selectedDates.includes(dateStr);
              const price = priceMap[dateStr];

              // Base Styles
              let bgClass = "bg-white border border-slate-100";
              let textClass = "text-slate-700";
              let priceColor = "text-slate-400";

              if (isSelected) {
                // Selected State (Modern touch on old style)
                bgClass = "bg-slate-900 border-slate-900 shadow-xl shadow-indigo-200 scale-[1.05] z-10";
                textClass = "text-white";
                priceColor = "text-slate-400";
              } else if (booking) {
                if (booking.status === "confirmed") {
                  bgClass = "bg-rose-50 border border-rose-100";
                  textClass = "text-rose-700";
                } else if (booking.status === "pending") {
                  bgClass = "bg-amber-50 border border-amber-100";
                  textClass = "text-amber-700";
                } else {
                  bgClass = "bg-slate-100 border border-slate-200";
                  textClass = "text-slate-500";
                }
              } else if (isPast) {
                bgClass = "bg-gray-50 border border-gray-50 opacity-60";
                textClass = "text-gray-400";
              } else if (isToday) {
                bgClass += " ring-2 ring-indigo-500 ring-offset-2";
                textClass = "text-indigo-600";
                priceColor = "text-indigo-400";
              }

              // --- ORIGINAL STYLING LOGIC END ---

              return (
                <motion.div
                  key={day}
                  layoutId={isSelected ? `selected-${dateStr}` : undefined}
                  onPointerDown={() => {
                    // Only start drag if no booking and not past
                    if (!booking && !isPast) handlePointerDown(dateStr);
                  }}
                  onClick={() => {
                    if (booking && onBookingClick) {
                      triggerHaptic();
                      onBookingClick(booking);
                    }
                  }}
                  onPointerEnter={() => {
                    handlePointerEnter(dateStr);
                  }}
                  className={`relative flex flex-col justify-between p-1.5 rounded-xl h-24 shadow-sm transition-all duration-200 select-none cursor-pointer ${bgClass}`}
                >
                  {/* Top Row: Date & Dot */}
                  <div className="flex justify-between items-start pointer-events-none">
                    <span className={`text-sm font-bold ${textClass}`}>
                      {day}
                    </span>
                    {/* Simplified dot logic for now or overrides if available */}
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </div>

                  {/* Bottom Row: Content */}
                  {booking ? (
                    <div className="mt-1 pointer-events-none">
                      <div
                        className={`text-[9px] font-semibold leading-tight truncate px-1 py-0.5 rounded-md w-full ${booking.status === "confirmed"
                          ? "bg-rose-100/50"
                          : "bg-amber-100/50"
                          }`}
                      >
                        {/* We don't have guest names here yet, just show Status or 'Booked' */}
                        {booking.status}
                      </div>
                    </div>
                  ) : (
                    !isPast && (
                      <div
                        className={`text-[9px] font-medium text-right self-end mt-auto pointer-events-none ${priceColor}`}
                      >
                        {price ? `₹${(price / 1000).toFixed(1)}k` : "-"}
                      </div>
                    )
                  )}
                </motion.div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CalendarGrid;
