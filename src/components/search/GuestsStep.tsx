"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface GuestsStepProps {
  adults: number;
  setAdults: (n: number) => void;
  childrenState: number;
  setChildrenState: (n: number) => void;
  pets: number;
  setPets: (n: number) => void;
}

const MAX_GUESTS = 15;

const Counter: React.FC<{
  title: string;
  subtitle: string;
  value: number;
  onChange: (n: number) => void;
  canIncrement: boolean;
}> = ({ title, subtitle, value, onChange, canIncrement }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
    <div className="min-w-0">
      <p className="text-[15px] font-bold text-slate-900">{title}</p>
      <p className="text-[12px] text-slate-500 font-medium">{subtitle}</p>
    </div>
    <div className="flex items-center gap-4 flex-shrink-0">
      <button
        onClick={() => {
          triggerHaptic();
          onChange(Math.max(0, value - 1));
        }}
        disabled={value === 0}
        className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 active:scale-90 active:bg-slate-50 transition-transform disabled:opacity-30"
        aria-label={`Decrease ${title}`}
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Digit rolls rather than snapping — the one flourish worth keeping here. */}
      <div className="w-6 text-center overflow-hidden h-6 relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="block text-[16px] font-black text-slate-900 leading-6"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        onClick={() => {
          triggerHaptic();
          onChange(value + 1);
        }}
        disabled={!canIncrement}
        className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 active:scale-90 active:bg-slate-50 transition-transform disabled:opacity-30"
        aria-label={`Increase ${title}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const GuestsStep: React.FC<GuestsStepProps> = ({
  adults,
  setAdults,
  childrenState,
  setChildrenState,
  pets,
  setPets,
}) => {
  const total = adults + childrenState + pets;
  const roomForMore = total < MAX_GUESTS;
  // Children and pets can't be the only occupants — there has to be an adult.
  const hasAdult = adults > 0;

  return (
    <div className="px-4 pb-8">
      <h2 className="text-[26px] font-black text-slate-900 tracking-tight pt-5 pb-1 leading-tight">
        Who's coming?
      </h2>
      <p className="text-[13px] text-slate-500 font-medium mb-2">
        Optional — skip it and browse everything.
      </p>

      <div className="mt-2">
        <Counter
          title="Adults"
          subtitle="Ages 13 or above"
          value={adults}
          onChange={setAdults}
          canIncrement={roomForMore}
        />
        <Counter
          title="Children"
          subtitle="Ages 2–12"
          value={childrenState}
          onChange={setChildrenState}
          canIncrement={roomForMore && hasAdult}
        />
        <Counter
          title="Pets"
          subtitle="Bringing a service animal?"
          value={pets}
          onChange={setPets}
          canIncrement={roomForMore && hasAdult}
        />
      </div>

      {!hasAdult && (childrenState > 0 || pets > 0) && (
        <p className="mt-3 text-[12px] font-semibold text-amber-600">
          Add an adult to the booking first.
        </p>
      )}
      {!roomForMore && (
        <p className="mt-3 text-[12px] font-semibold text-slate-500">
          That's our maximum of {MAX_GUESTS} per booking.
        </p>
      )}
    </div>
  );
};

export default GuestsStep;
