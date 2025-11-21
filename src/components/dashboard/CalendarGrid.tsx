"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RoovoLoader from "../RoovoLoader";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

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
}

const CalendarGrid = ({
  currentDate,
  bookings,
  isLoading,
  direction,
  onPreviousMonth,
  onNextMonth,
}: CalendarGridProps) => {
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

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.4 },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      transition: { duration: 0.4 },
    }),
  };

  const handlePrev = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onPreviousMonth();
  };

  const handleNext = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onNextMonth();
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handlePrev}
            className="p-2 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={handleNext}
            className="p-2 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden min-h-[350px]">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="font-medium text-gray-400 text-xs uppercase tracking-wider py-2"
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
            className="grid grid-cols-7 gap-1 text-center absolute w-full"
          >
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {isLoading ? (
              <div className="col-span-7 flex justify-center items-center h-64">
                <RoovoLoader />
              </div>
            ) : (
              Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                const booking = bookings.find((b) => {
                  const startDate = new Date(b.start_date);
                  const endDate = new Date(b.end_date);
                  return date >= startDate && date <= endDate;
                });

                const isToday = new Date().toDateString() === date.toDateString();

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "confirmed":
                      return "bg-rose-500 text-white shadow-md shadow-rose-200";
                    case "pending":
                      return "bg-amber-400 text-white shadow-md shadow-amber-200";
                    case "completed":
                      return "bg-slate-200 text-slate-600";
                    default:
                      return "bg-gray-50 text-gray-400";
                  }
                };

                return (
                  <div
                    key={day}
                    className={`aspect-square p-1 relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${booking
                      ? getStatusColor(booking.status)
                      : isToday
                        ? "bg-indigo-50 text-indigo-600 font-bold"
                        : "hover:bg-gray-50 text-gray-700"
                      }`}
                  >
                    <span className={`text-sm ${isToday ? "font-bold" : "font-medium"}`}>
                      {day}
                    </span>
                    {booking && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CalendarGrid;
