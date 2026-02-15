import React from 'react';
import { Briefcase, Calendar } from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';
import RoovoLogo from './RoovoLogo';
import CorporateBookingDrawer from './CorporateBookingDrawer';
import LongStayDrawer from './LongStayDrawer';
import { usePreloadedData } from '@/context/PreloadContext';
import supabase from '@/services/api';

const HomeOptionsPills: React.FC = () => {
    const { profileData } = usePreloadedData();
    const [isOpen, setIsOpen] = React.useState(false);
    const [showBackdrop, setShowBackdrop] = React.useState(false);
    const [showButtonAnimation, setShowButtonAnimation] = React.useState(false);

    const [isCorporateDrawerOpen, setIsCorporateDrawerOpen] = React.useState(false);
    const [isLongStayDrawerOpen, setIsLongStayDrawerOpen] = React.useState(false);

    const autoCloseTimer = React.useRef<NodeJS.Timeout | null>(null);
    const [currentUserId, setCurrentUserId] = React.useState<string>('');

    React.useEffect(() => {
        setIsOpen(true);

        const fetchUserId = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                setCurrentUserId(session.user.id);
            }
        };
        fetchUserId();

        autoCloseTimer.current = setTimeout(() => {
            setIsOpen(false);
            setTimeout(() => {
                setShowButtonAnimation(true);
            }, 400);
        }, 2500);

        return () => {
            if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
        };
    }, []);

    const handleAction = async (action: string) => {
        triggerHaptic();
        console.log(`${action} clicked`);
        setIsOpen(false);
        setShowBackdrop(false);

        let userId = currentUserId;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id || '';
        }

        if (!userId) {
            console.error('No user ID found in session');
            if (action === 'Corporate booking') setIsCorporateDrawerOpen(true);
            if (action === 'Long stays') setIsLongStayDrawerOpen(true);
            return;
        }

        if (action === 'Corporate booking') {
            try {
                // Send immediate lead notification
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/corporate-interest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        userName: profileData?.name || 'User',
                        userPhone: profileData?.phone || '',
                    }),
                });
            } catch (error) {
                console.error('Failed to send corporate interest notification:', error);
            }
            setIsCorporateDrawerOpen(true);
        } else if (action === 'Long stays') {
            try {
                // Send immediate lead notification
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/long-stay-interest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        userName: profileData?.name || 'User',
                        userPhone: profileData?.phone || '',
                    }),
                });
            } catch (error) {
                console.error('Failed to send long stay interest notification:', error);
            }
            setIsLongStayDrawerOpen(true);
        }
    };

    const toggleOpen = () => {
        triggerHaptic();
        if (autoCloseTimer.current) {
            clearTimeout(autoCloseTimer.current);
            autoCloseTimer.current = null;
        }

        if (isOpen) {
            setIsOpen(false);
            setShowBackdrop(false);
        } else {
            setIsOpen(true);
            setShowBackdrop(true);
            setShowButtonAnimation(false);
        }
    };

    // --- Animation Logic ---
    const containerVariants: Variants = {
        visible: { transition: { staggerChildren: 0.08, staggerDirection: -1, delayChildren: 0 } },
        hidden: { transition: { staggerChildren: 0.08, staggerDirection: 1 } }
    };

    const itemVariants: Variants = {
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 25 } },
        hidden: { opacity: 0, y: 55, scale: 0.85, transition: { duration: 0.25, ease: "easeInOut" } }
    };

    const buttonVariants: Variants = {
        initial: { scale: 1, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
        animate: {
            scale: [1, 1.08, 1.05, 1.08, 1],
            boxShadow: [
                "0 8px 32px rgba(0,0,0,0.12)",
                "0 25px 50px -12px rgb(99 102 241 / 0.4), 0 0 30px rgb(99 102 241 / 0.3)",
                "0 25px 50px -12px rgb(99 102 241 / 0.3), 0 0 25px rgb(99 102 241 / 0.2)",
                "0 25px 50px -12px rgb(99 102 241 / 0.4), 0 0 30px rgb(99 102 241 / 0.3)",
                "0 8px 32px rgba(0,0,0,0.12)"
            ],
            transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.3, 0.5, 0.7, 1] }
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && showBackdrop && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-col items-end relative z-[70]">
                <div className="absolute bottom-0 right-0 w-full flex flex-col items-end gap-1 pb-14 pointer-events-none z-10">
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={containerVariants}
                                className="flex flex-col items-end gap-3 pointer-events-auto"
                            >
                                <motion.button
                                    variants={itemVariants}
                                    onClick={() => handleAction("Long stays")}
                                    className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-white/50 shadow-lg rounded-full py-3 px-6 active:scale-[0.95] origin-bottom"
                                    style={{ borderRadius: '9999px' }}
                                >
                                    <div className="bg-indigo-50/80 p-1.5 rounded-full text-indigo-600">
                                        <Calendar size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">Long stays</span>
                                        <span className="text-[10px] font-bold text-indigo-600 leading-none">10+ days</span>
                                    </div>
                                </motion.button>

                                <motion.button
                                    variants={itemVariants}
                                    onClick={() => handleAction("Corporate booking")}
                                    className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-white/50 shadow-lg rounded-full py-3 px-6 active:scale-[0.95] origin-bottom"
                                    style={{ borderRadius: '9999px' }}
                                >
                                    <div className="bg-indigo-50/80 p-1.5 rounded-full text-indigo-600">
                                        <Briefcase size={16} strokeWidth={2.5} />
                                    </div>
                                    <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">Corporate booking</span>
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    layout
                    onClick={toggleOpen}
                    whileTap={{ scale: 0.95 }}
                    variants={buttonVariants}
                    initial="initial"
                    animate={showButtonAnimation ? "animate" : "initial"}
                    className="relative z-20 flex items-center gap-2 h-10 pl-2 pr-4 rounded-full bg-white/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20 overflow-hidden"
                    style={{ borderRadius: '9999px' }}
                >
                    <div className="w-12 h-full flex items-center justify-center">
                        <RoovoLogo />
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-3 h-5">
                        <span className="font-bold text-xs text-slate-700">Specials</span>
                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap hidden sm:inline-block">Corporate/Long stays</span>
                    </div>
                </motion.button>
            </div>

            {profileData && (
                <CorporateBookingDrawer
                    isOpen={isCorporateDrawerOpen}
                    onClose={() => setIsCorporateDrawerOpen(false)}
                    userName={profileData.name || 'User'}
                    userPhone={profileData.phone || ''}
                    userId={currentUserId || profileData.id || ''}
                />
            )}

            {profileData && (
                <LongStayDrawer
                    isOpen={isLongStayDrawerOpen}
                    onClose={() => setIsLongStayDrawerOpen(false)}
                    userName={profileData.name || 'User'}
                    userPhone={profileData.phone || ''}
                    userId={currentUserId || profileData.id || ''}
                />
            )}
        </>
    );
};

export default HomeOptionsPills;