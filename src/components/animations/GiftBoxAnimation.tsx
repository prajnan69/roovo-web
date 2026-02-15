import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, PartyPopper } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface GiftBoxAnimationProps {
    onComplete: () => void;
}

export const GiftBoxAnimation = ({ onComplete }: GiftBoxAnimationProps) => {
    const [stage, setStage] = useState<'idle' | 'shaking' | 'exploding' | 'revealing'>('idle');

    const startAnimation = () => {
        if (stage !== 'idle') return;
        triggerHaptic();
        setStage('shaking');

        // Sequence: Shake for 1.2s (faster), then Explode
        setTimeout(() => {
            setStage('exploding');
            triggerHaptic();

            // Reveal after explosion
            setTimeout(() => {
                setStage('revealing');
                // Complete after reveal is shown
                setTimeout(() => {
                    onComplete();
                }, 2000);
            }, 600);
        }, 1200);
    };

    return (
        <div className="fixed bottom-28 right-6 z-[40] pointer-events-none">
            <AnimatePresence>
                {stage !== 'revealing' && (
                    <motion.div
                        key="gift-box-main"
                        initial={{ scale: 0, opacity: 0, y: 50, filter: 'blur(10px)' }}
                        animate={{
                            scale: stage === 'idle' ? 1 : [1, 1.15, 1],
                            opacity: 1,
                            rotate: stage === 'shaking' ? [0, -15, 15, -15, 15, 0] : 0,
                            y: 0,
                            filter: 'blur(0px)'
                        }}
                        transition={{
                            scale: { duration: 0.4, times: [0, 0.5, 1] },
                            rotate: stage === 'shaking' ? { repeat: Infinity, duration: 0.12, ease: "linear" } : { duration: 0.4 },
                            y: { type: 'spring', damping: 20, stiffness: 100 }
                        }}
                        exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                        className="pointer-events-auto cursor-pointer relative"
                        onClick={startAnimation}
                    >
                        {/* Ambient Background Glow */}
                        <motion.div
                            animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="absolute inset-[-20%] bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 rounded-full blur-2xl -z-10"
                        />

                        {/* Glassmorphic Container */}
                        <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl md:rounded-[1.25rem] bg-white/20 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.15)] overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/60 via-purple-500/60 to-pink-500/60 opacity-80 group-hover:opacity-100 transition-opacity" />
                            <Gift size={24} className="text-white relative z-10 md:w-7 md:h-7" />

                            {/* Shine Sweep */}
                            <motion.div
                                animate={{ x: [-100, 100] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 z-20"
                            />
                        </div>

                        {/* Modern Hint Label */}
                        {stage === 'idle' && (
                            <motion.div
                                key="gift-box-idle-hint"
                                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/10"
                            >
                                <Sparkles size={12} className="text-yellow-400" />
                                <span className="text-[11px] font-bold tracking-tight whitespace-nowrap uppercase">Claim Discount</span>
                                <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 rotate-45 w-1.5 h-1.5 bg-slate-900/80" />
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {stage === 'exploding' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        {Array.from({ length: 24 }).map((_, i) => {
                            const angle = (i / 24) * 360 + Math.random() * 30;
                            const distance = 80 + Math.random() * 120;
                            const x = Math.cos(angle * (Math.PI / 180)) * distance;
                            const y = Math.sin(angle * (Math.PI / 180)) * distance;
                            const size = 6 + Math.random() * 8;
                            const colors = ['#6366f1', '#fbbf24', '#f472b6', '#10b981', '#f87171'];
                            const color = colors[i % colors.length];

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                                    animate={{
                                        x,
                                        y,
                                        scale: [0, 1.5, 1, 0],
                                        opacity: [1, 1, 1, 0],
                                        rotate: Math.random() * 540
                                    }}
                                    transition={{
                                        duration: 0.7,
                                        ease: "easeOut"
                                    }}
                                    className="absolute rounded-sm"
                                    style={{
                                        width: size,
                                        height: size,
                                        backgroundColor: color,
                                        boxShadow: `0 0 12px ${color}60`
                                    }}
                                />
                            );
                        })}
                    </div>
                )}

                {stage === 'revealing' && (
                    <motion.div
                        key="gift-box-reveal-card"
                        initial={{ scale: 0.8, opacity: 0, x: 20, y: 20 }}
                        animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                        className="absolute bottom-0 right-0 bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 flex flex-col items-center gap-2 text-center z-[102] min-w-[220px]"
                    >
                        <motion.div
                            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-600"
                        >
                            <PartyPopper size={36} />
                        </motion.div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight italic">BOOM!</h2>
                            <p className="text-emerald-600 font-bold text-sm leading-tight mt-0.5">Best price on the internet</p>
                            <p className="text-slate-500/80 text-[10px] uppercase font-bold tracking-widest mt-1.5">Service Fee Waived</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GiftBoxAnimation;
