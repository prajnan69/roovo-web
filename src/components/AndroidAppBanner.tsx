import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function AndroidAppBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if on web AND on Mobile (Android or iOS)
        const isWeb = !Capacitor.isNativePlatform();
        const userAgent = navigator.userAgent || navigator.vendor;
        const isAndroid = /Android/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

        // Check if user has closed it before in this session
        const isDismissed = sessionStorage.getItem('mobile-banner-dismissed');

        if (isWeb && (isAndroid || isIOS) && !isDismissed) {
            // Delay slightly to not overwhelm on load
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('mobile-banner-dismissed', 'true');
    };

    const handleLaunchApp = () => {
        // Replace with actual Play Store link or Deep Link
        window.location.href = 'https://play.google.com/store/apps/details?id=in.roovo.app';
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] px-4 py-3"
                >
                    <div className="max-w-md mx-auto bg-black text-white rounded-2xl shadow-2xl flex items-center justify-between p-3 border border-white/10 backdrop-blur-md bg-black/90">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <Smartphone className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold">Roovo is better in the app</div>
                                <div className="text-[10px] text-neutral-400">Faster experience & instant booking</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleLaunchApp}
                                className="bg-green-500 hover:bg-green-600 text-black text-xs font-bold px-4 py-2 rounded-full transition-all active:scale-95"
                            >
                                Launch
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="p-1 hover:bg-white/10 rounded-full transition-all"
                            >
                                <X className="w-4 h-4 text-neutral-400" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
