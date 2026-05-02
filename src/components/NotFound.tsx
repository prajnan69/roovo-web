import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import RoovoLogo from './RoovoLogo';

const NotFound: React.FC = () => {
    const { navigate, back } = useNavigation();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
            {/* Animated Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="w-32 mb-12"
            >
                <RoovoLogo />
            </motion.div>

            {/* Big 404 with floating animation */}
            <div className="relative">
                <motion.h1
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.2
                    }}
                    className="text-[120px] font-black text-slate-900 leading-none tracking-tighter"
                >
                    404
                </motion.h1>
                <motion.div
                    animate={{ 
                        y: [0, -10, 0],
                    }}
                    transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -top-4 -right-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-indigo-200"
                >
                    Lost?
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 max-w-xs"
            >
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Page Not Found</h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                    Oops! The page you're looking for seems to have wandered off to a secret destination.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-12 flex flex-col gap-4 w-full max-w-xs"
            >
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-xl shadow-slate-200"
                >
                    <Home size={20} />
                    Back to Home
                </button>
                
                <button
                    onClick={back}
                    className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    <ArrowLeft size={20} />
                    Go Back
                </button>
            </motion.div>

            {/* Decorative background elements */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ 
                        rotate: 360,
                        x: [0, 20, 0],
                        y: [0, 40, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ 
                        rotate: -360,
                        x: [0, -30, 0],
                        y: [0, -50, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-50/50 rounded-full blur-3xl"
                />
            </div>
        </div>
    );
};

export default NotFound;
