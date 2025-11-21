"use client";

import { motion } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

const BookingBar = ({ price, onReserveClick }: { price: number, onReserveClick: () => void }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 w-full z-50"
    >
      {/* Glassmorphism Container */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200/50 px-6 py-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          {/* Price Section */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">₹{price.toLocaleString()}</span>
              <span className="text-sm font-medium text-slate-500">/ night</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600">Best price guaranteed</span>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-3">
            {/* Chat Button - Secondary Action */}
            <motion.button 
              className="p-3 rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
              whileTap={{ scale: 0.92 }}
              onClick={() => triggerHaptic()}
              aria-label="Chat with host"
            >
              <MessageCircle className="w-5 h-5" />
            </motion.button>

            {/* Reserve Button - Primary Action */}
            <motion.button 
              onClick={() => {
                triggerHaptic();
                onReserveClick();
              }}
              className="relative overflow-hidden px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/25 active:shadow-sm transition-all"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Reserve
              </span>
              {/* Subtle shine effect overlay */}
              <div className="absolute inset-0 bg-white/20 translate-y-full skew-y-12 group-hover:translate-y-[-150%] transition-transform duration-700 ease-in-out" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BookingBar;
