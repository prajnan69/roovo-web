"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldAlert } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface NotificationPromptDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onEnable: () => void;
    isLoading?: boolean;
}

const NotificationPromptDrawer = ({ isOpen, onClose, onEnable, isLoading = false }: NotificationPromptDrawerProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 pointer-events-auto"
                        onClick={() => {
                            triggerHaptic();
                            onClose();
                        }}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 pb-safe-bottom"
                    >
                        <div className="bg-white rounded-t-[32px] overflow-hidden drop-shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border border-slate-100/50">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4" />

                            <div className="px-6 pb-8">
                                <div className="flex flex-col items-center text-center mt-2">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5 ring-8 ring-indigo-50/50 relative">
                                        <Bell className="text-indigo-600 animate-bounce" size={40} strokeWidth={2.5} />
                                        <div className="absolute top-0 right-1 w-4 h-4 bg-rose-500 rounded-full ring-2 ring-white" />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                                        Don't miss a beat!
                                    </h3>

                                    <p className="text-slate-500 text-[15px] font-medium leading-relaxed max-w-sm mb-8">
                                        Enable notifications to get critical updates about your trips, split payments, and fast replies from hosts right to your device.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 w-full">
                                    <button
                                        onClick={() => {
                                            triggerHaptic();
                                            onEnable();
                                        }}
                                        disabled={isLoading}
                                        className="w-full bg-indigo-600 text-white font-bold text-base py-4 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Bell size={20} />
                                                Enable Notifications
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            triggerHaptic();
                                            onClose();
                                        }}
                                        disabled={isLoading}
                                        className="w-full bg-slate-100 text-slate-600 font-bold text-base py-4 rounded-full active:scale-[0.98] transition-all"
                                    >
                                        Not right now
                                    </button>
                                </div>

                                <div className="flex items-center justify-center gap-1.5 mt-6 text-slate-400">
                                    <ShieldAlert size={14} />
                                    <p className="text-xs font-semibold uppercase tracking-wider">You can disable this anytime</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationPromptDrawer;
