"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import MobileWhen from '../MobileWhen';

interface DatesStepProps {
  dates: { checkIn: Date | null; checkOut: Date | null };
  setDates: (dates: { checkIn: Date | null; checkOut: Date | null }) => void;
  isFlexible: boolean;
  setIsFlexible: (v: boolean) => void;
  destinationName: string | null;
}

const DatesStep: React.FC<DatesStepProps> = ({
  dates,
  setDates,
  isFlexible,
  setIsFlexible,
  destinationName,
}) => {
  const nights =
    dates.checkIn && dates.checkOut
      ? Math.max(
          1,
          Math.round((dates.checkOut.getTime() - dates.checkIn.getTime()) / 86400000)
        )
      : 0;

  return (
    <div className="px-4 pb-8">
      <h2 className="text-[26px] font-black text-slate-900 tracking-tight pt-5 pb-1 leading-tight">
        When's the trip?
      </h2>
      <p className="text-[13px] text-slate-500 font-medium mb-4">
        {destinationName ? `Stays in ${destinationName}` : 'Pick your dates'}
      </p>

      {/* Exact vs flexible */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {[
          { flexible: false, label: 'Exact dates', icon: CalendarDays },
          { flexible: true, label: "I'm flexible", icon: Sparkles },
        ].map(({ flexible, label, icon: Icon }) => {
          const active = isFlexible === flexible;
          return (
            <button
              key={label}
              onClick={() => {
                triggerHaptic();
                setIsFlexible(flexible);
                if (flexible) setDates({ checkIn: null, checkOut: null });
              }}
              className={`flex items-center gap-2 px-3.5 py-3 rounded-2xl border transition-colors ${
                active
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/15'
                  : 'border-slate-200 bg-white active:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className={`text-[13px] font-bold ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {isFlexible ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-10 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-[15px] font-bold text-slate-900">Dates are open</p>
          <p className="text-[13px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
            We'll show every stay{destinationName ? ` in ${destinationName}` : ''}, and you can
            settle on dates later.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {nights > 0 && (
            <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
              <span className="text-[12px] font-bold text-indigo-700">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </div>
          )}
          <MobileWhen dates={dates} setDates={setDates} />
        </motion.div>
      )}
    </div>
  );
};

export default DatesStep;
