"use client";

import React, { useState } from 'react';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './ui/toast';

dayjs.extend(weekday);

interface MobileWhenProps {
  dates: { checkIn: Date | null; checkOut: Date | null };
  setDates: (dates: { checkIn: Date | null; checkOut: Date | null }) => void;
  bookings?: any[];
}

const wittyMessages = [
  "⏰ Time travel isn't available yet! Pick a future date.",
  "🕰️ Unless you have a DeLorean, let's stick to future dates!",
  "⌛ The past is history, the future is mystery - pick ahead!",
  "🚀 We can't book yesterday's rooms, they're occupied by memories!",
  "📅 That ship has sailed! Choose a date ahead.",
  "⏳ Oops! That date is in the rearview mirror.",
  "🔮 Let's focus on the future, not the past!",
  "🎭 Time machines are still in beta. Future dates only!",
];

const MobileWhen: React.FC<MobileWhenProps> = ({ dates, setDates, bookings = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [direction, setDirection] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const changeMonth = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentMonth(currentMonth.add(newDirection, "month"));
  };

  const isDateBlocked = (date: dayjs.Dayjs) => {
    return bookings.some(b => {
      const start = dayjs(b.start_date);
      const end = dayjs(b.end_date);
      return (date.isSame(start, 'day') || date.isAfter(start, 'day')) && date.isBefore(end, 'day');
    });
  };

  const getBookingForDate = (date: dayjs.Dayjs) => {
    return bookings.find(b => {
      const start = dayjs(b.start_date);
      const end = dayjs(b.end_date);
      return (date.isSame(start, 'day') || date.isAfter(start, 'day')) && date.isBefore(end, 'day');
    });
  };

  const handleDateClick = (date: dayjs.Dayjs) => {
    const isPastDate = date.isBefore(dayjs(), 'day');
    const isBlocked = isDateBlocked(date);

    if (isPastDate || isBlocked) {
      const message = isBlocked
        ? "🔒 This date is already booked! Try another one."
        : wittyMessages[Math.floor(Math.random() * wittyMessages.length)];
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const selectedDate = date.toDate();
    if (!dates.checkIn || (dates.checkIn && dates.checkOut)) {
      setDates({ checkIn: selectedDate, checkOut: null });
    } else {
      if (date.isBefore(dayjs(dates.checkIn))) {
        setDates({ checkIn: selectedDate, checkOut: null });
      } else {
        let current = dayjs(dates.checkIn);
        let hasBlocked = false;
        while (current.isBefore(date)) {
          if (isDateBlocked(current)) {
            hasBlocked = true;
            break;
          }
          current = current.add(1, 'day');
        }

        if (hasBlocked) {
          setToastMessage("🚫 Range includes booked dates!");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          return;
        }

        setDates({ ...dates, checkOut: selectedDate });
      }
    }
  };

  const renderCalendar = (month: dayjs.Dayjs) => {
    const startOfMonth = month.startOf("month");
    const startDay = startOfMonth.weekday();
    const daysInMonth = month.daysInMonth();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(startOfMonth.subtract(startDay - i, "day"));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(startOfMonth.date(i));
    }

    return (
      <div className="mt-2">
        <div className="grid grid-cols-7 gap-y-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
          ))}
          {days.map((date, idx) => {
            const isCurrentMonth = date.month() === month.month();
            const isToday = date.isSame(dayjs(), "day");
            const isPastDate = date.isBefore(dayjs(), 'day');
            const isBlocked = isDateBlocked(date);

            const isCheckIn = dates.checkIn && date.isSame(dayjs(dates.checkIn), "day");
            const isCheckOut = dates.checkOut && date.isSame(dayjs(dates.checkOut), "day");
            const inRange = dates.checkIn && dates.checkOut &&
              date.isAfter(dayjs(dates.checkIn), "day") &&
              date.isBefore(dayjs(dates.checkOut), "day");

            return (
              <motion.div
                key={idx}
                onClick={() => isCurrentMonth && handleDateClick(date)}
                whileHover={{ scale: (isPastDate || isBlocked) ? 1 : 1.1 }}
                whileTap={{ scale: (isPastDate || isBlocked) ? 1 : 0.95 }}
                className={`h-10 relative flex items-center justify-center rounded-full transition-all duration-200 font-semibold ${!isCurrentMonth ? 'text-slate-300' :
                  (isPastDate || isBlocked) ? "text-slate-300 opacity-60 cursor-not-allowed" :
                    isCheckIn || isCheckOut ? "bg-indigo-600 text-white shadow-md" :
                      inRange ? "bg-indigo-100 text-indigo-700" :
                        isToday ? "text-indigo-600" : "hover:bg-slate-100"
                  }`}
              >
                <span className={isBlocked ? "line-through decoration-slate-400" : ""}>
                  {date.date()}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </motion.button>
        <div className="flex-1 text-center">
          <h4 className="text-lg font-bold text-slate-900">{currentMonth.format("MMMM YYYY")}</h4>
        </div>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </motion.button>
      </div>
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentMonth.format("YYYY-MM")}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
        >
          {renderCalendar(currentMonth)}
        </motion.div>
      </AnimatePresence>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default MobileWhen;
