"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle } from 'react-icons/fi';
import supabase, { API_BASE_URL } from '@/services/api';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

// --- Animation Paths (Borrowed from PaymentStatus.tsx) ---
const INFINITY_PATH = "M900.450378,327.092316  C889.395569,321.869659 877.787842,317.556183 867.399780,311.237366  C844.969238,297.593292 827.497864,278.320740 810.860901,258.305328  C809.552307,256.730988 808.058716,255.310471 806.395508,253.547607  C792.509766,271.671021 779.028564,289.147644 765.803650,306.816193  C764.990356,307.902740 765.554077,311.014099 766.579102,312.315399  C771.817749,318.966095 777.143005,325.591156 782.943909,331.748596  C800.794128,350.696259 820.421021,367.405945 844.127319,378.777466  C866.190735,389.360992 889.511475,395.217896 913.742432,398.227600  C946.116699,402.248810 978.093628,401.447266 1008.420044,388.474976  C1071.170410,361.633179 1109.586548,316.241608 1113.723755,245.921585  C1115.653931,213.117035 1111.562378,181.109863 1094.652954,152.440781  C1064.626831,101.532661 1019.274719,73.027054 960.757629,66.425209  C938.091431,63.868038 915.240967,65.031616 892.667114,69.902550  C867.612793,75.308731 843.978943,84.016258 821.901306,97.079819  C793.654175,113.793930 771.019409,136.784393 750.735168,162.009277  C721.057983,198.914810 692.575562,236.778824 663.083313,273.835968  C639.559143,303.394348 611.320435,326.183899 572.721619,333.170746  C540.025208,339.089233 511.129486,331.830933 486.354156,309.381012  C455.805695,281.699829 450.095093,235.879929 462.509552,199.105377  C472.537933,169.398987 493.926636,150.158905 522.942871,140.648193  C553.713013,130.562622 583.995667,134.814575 612.634827,149.973679  C635.524292,162.089462 653.441406,179.910049 669.563782,199.774490  C672.751404,203.701920 675.977234,207.598221 679.765198,212.215546  C693.788330,194.023849 707.288757,176.585266 720.615540,159.015015  C721.331482,158.071167 721.179382,155.580872 720.421143,154.562775  C717.347351,150.435562 713.869019,146.610535 710.557068,142.659653  C676.297119,101.790367 634.250183,75.018456 579.979309,70.024750  C544.252869,66.737396 509.634705,69.674515 476.773468,85.632614  C446.572052,100.299065 422.130188,121.315140 404.059662,149.599930  C391.478271,169.292831 385.011230,191.106903 382.350281,214.191162  C378.613007,246.612686 381.464691,278.565399 395.884369,307.817932  C422.307098,361.420410 466.884156,391.645386 525.567078,400.233795  C541.702515,402.595276 558.652954,402.123932 574.921387,400.261566  C607.125183,396.574799 637.474976,386.239594 665.312988,369.265961  C695.612976,350.791199 719.528137,325.429657 741.245422,297.862610  C767.652405,264.342590 793.579895,230.445190 819.948303,196.894562  C843.181091,167.333420 870.976990,144.114731 908.693542,135.393600  C931.375427,130.148911 954.309143,129.660477 975.844910,138.733536  C1010.609985,153.380157 1032.893921,178.924423 1037.714478,217.545074  C1040.247192,237.836761 1039.302002,257.940369 1030.750122,276.801270  C1018.634033,303.523163 998.294495,321.190552 969.943665,329.428802  C946.785522,336.158142 923.915466,334.596283 900.450378,327.092316";
const CHECKMARK_PATH = "M580 230 L730 380 L1030 80";

type VerificationStatus = 'input' | 'verifying' | 'success' | 'success_transition';

const VerifyIdentity = () => {
  const [status, setStatus] = useState<VerificationStatus>('input');
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    pan: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const { navigate } = useNavigation();

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setError(null);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setStatus('verifying');
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error("Please log in to verify your identity.");
      }

      if (!formData.name || !formData.dob || !formData.pan) {
        throw new Error("All fields are required.");
      }

      const response = await fetch(`${API_BASE_URL}/api/verify-pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          name: formData.name,
          dob: formData.dob,
          pan: formData.pan
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Verification failed");
      }

      if (result.success) {
        setStatus('success');
      } else {
        throw new Error(result.message || "Verification failed");
      }

    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setStatus('input'); // Return to input on error
    }
  };

  // --- Success Effects: Confetti & Redirect ---
  const confettiFired = React.useRef(false);

  useEffect(() => {
    if (status === 'success') {
      // 1. Trigger Confetti (Once)
      if (!confettiFired.current) {
        confettiFired.current = true;

        const triggerConfetti = () => {
          const count = 200;
          const defaults = {
            origin: { y: 0.7 },
            zIndex: 100,
            ticks: 200,
            gravity: 0.8,
            scalar: 1,
          };
          const fire = (particleRatio: number, opts: any) => {
            confetti({
              ...defaults, ...opts,
              particleCount: Math.floor(count * particleRatio),
              colors: ['#10b981', '#34d399', '#fcd34d', '#fbbf24', '#ffffff']
            });
          };
          fire(0.25, { spread: 26, startVelocity: 55 });
          fire(0.2, { spread: 60 });
          fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
          fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
          fire(0.1, { spread: 120, startVelocity: 45 });
        };

        // Slight delay for confetti to match checkmark pop
        setTimeout(triggerConfetti, 400);

        // 2. Haptic
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([10, 30, 10, 30]);
        }
      }

      // 3. Countdown & Redirect
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            navigate('/hosting');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Backup Redirect
      const navTimer = setTimeout(() => {
        navigate('/hosting');
      }, 5500);

      return () => {
        clearInterval(interval);
        clearTimeout(navTimer);
      };
    }
  }, [status, navigate]);


  // --- Render Helpers ---

  // 1. Loading State (Infinity Path)
  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-200/40 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-32 h-32 relative z-10 mb-8">
          <svg viewBox="350 50 800 380" className="w-full h-full text-indigo-600 drop-shadow-[0_4px_10px_rgba(79,70,229,0.3)]">
            <motion.path
              d={INFINITY_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1],
                opacity: [0, 1, 0.5],
                pathOffset: [0, 0, 1]
              }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
          </svg>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg font-medium text-slate-600 z-10"
        >
          Verifying details...
        </motion.p>
      </div>
    );
  }

  // 2. Success State (Checkmark + Glow)
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-emerald-200">
        <svg width="0" height="0">
          <defs>
            <filter id="light-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.8 0 0 0 0 0.5 0 0 0 0.5 0" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/50 blur-[120px] rounded-full pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="relative z-10 w-[90%] max-w-sm p-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

          <div className="w-52 h-44 mb-8 -mt-4 relative flex items-center justify-center text-emerald-500">
            <motion.svg viewBox="350 50 800 380" className="w-full h-full" style={{ filter: "url(#light-glow)" }}>
              {/* Ghost Path Fading Out */}
              <motion.path
                d={INFINITY_PATH}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0, pathLength: 0 }}
                transition={{ duration: 0.5, ease: "circIn" }}
              />
              {/* Checkmark */}
              <motion.path
                d={CHECKMARK_PATH}
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1, scale: [1, 1.1, 1] }}
                transition={{
                  pathLength: { duration: 0.6, type: "spring", stiffness: 120, damping: 14, delay: 0.4 },
                  scale: { duration: 0.4, delay: 0.8 },
                  opacity: { duration: 0.2, delay: 0.4 }
                }}
              />
            </motion.svg>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 150 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Verified!</h2>
            <p className="text-slate-500 text-sm font-medium tracking-wide leading-relaxed mb-6">
              Your identity has been successfully verified.<br />Redirecting in {countdown}s...
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // 3. Input Form State (Glassmorphism)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/40 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Verify Identity</h2>
            <p className="text-slate-500 text-sm">Enter your PAN card details to comply with regulations and start hosting.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Full Name (as on PAN)</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 bg-white/50 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900 bg-white/50"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">PAN Number</label>
              <input
                type="text"
                name="pan"
                placeholder="ABCDE1234F"
                maxLength={10}
                value={formData.pan}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData(prev => ({ ...prev, pan: val }));
                  setError(null);
                }}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all uppercase placeholder:text-slate-300 bg-white/50 text-slate-900 font-mono tracking-widest text-lg"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm flex items-start gap-3 border border-rose-100/50"
                >
                  <FiAlertCircle className="flex-shrink-0 mt-0.5 text-lg" />
                  <span className="leading-snug">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleSubmit}
              className="mt-4 w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] text-lg"
            >
              Verify Identity
            </Button>

            <button
              onClick={() => navigate('/hosting')}
              className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors text-sm"
            >
              Cancel and return to dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyIdentity;
