import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumInfoBannerProps {
    show: boolean;
    onClose: () => void;
    onClick?: () => void;
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
    duration?: number;
}

const PremiumInfoBanner: React.FC<PremiumInfoBannerProps> = ({
    show,
    onClose,
    onClick,
    title,
    subtitle,
    icon,
    duration = 5000,
}) => {
    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ height: 0, opacity: 0, y: -20 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-lg overflow-hidden border-b border-indigo-100 cursor-pointer"
                    onClick={onClick}
                >
                    <div className="pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 px-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                {icon || (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">{subtitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PremiumInfoBanner;
