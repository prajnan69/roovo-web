"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "@/services/api";
import { Spinner } from "./ui/shadcn-io/spinner";
import RoovoLogo from "./RoovoLogo";
import { Haptics, NotificationType } from '@capacitor/haptics';
import Toast from './ui/toast';
import { SUCCESS_MESSAGES, FAILURE_MESSAGES, getRandomMessage } from '@/utils/loginMessages';

interface LoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  title?: string;
  subtitle?: string;
  redirectPath?: string;
}

const slideVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
};

export default function Login({
  isOpen,
  onClose,
  onLoginSuccess,
  title,
  subtitle,
  redirectPath,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setIsVisible(isOpen);
    if (isOpen) {
      setLoginStatus('idle');
      setError(null);
      setEmail("");
      setPassword("");
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 350);
  };

  const triggerHaptic = async (type: 'success' | 'error') => {
    if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.notification({ type: NotificationType.Error });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoginStatus('idle');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setLoginStatus('success');
      triggerHaptic('success');

      // Show success toast with random message
      setToastMessage(getRandomMessage(SUCCESS_MESSAGES));
      setShowToast(true);

      // Delay slightly to show success animation and toast
      setTimeout(() => {
        onLoginSuccess();
        window.location.href = "/";
      }, 1500);

    } catch (err) {
      setLoginStatus('error');
      triggerHaptic('error');

      // Show error toast with random message
      setToastMessage(getRandomMessage(FAILURE_MESSAGES));
      setShowToast(true);

      if (err instanceof Error) setError(err.message);
      else setError("Unexpected error occurred");

      // Auto-hide toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRedirecting && redirectPath) {
      window.location.href = redirectPath;
    }
  }, [isRedirecting, redirectPath]);

  // Determine the status to pass to the logo animation
  const getLogoStatus = () => {
    if (loading) return 'loading';
    if (loginStatus === 'success') return 'success';
    if (loginStatus === 'error') return 'error';
    return 'idle';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl text-neutral-900 flex flex-col"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={slideVariants}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-end p-6">
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Content */}
          {isRedirecting ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Spinner size={48} />
              <h2 className="text-xl font-bold mt-6">Redirecting...</h2>
              <p className="mt-2 text-neutral-500">Please wait a moment.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center px-8 max-w-md mx-auto w-full pb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex justify-center mb-8"
              >
                <div className="w-32 h-auto">
                  {/* Pass repeatCount={2} to stop animation after 2 loops */}
                  <RoovoLogo status={getLogoStatus()} repeatCount={2} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-10"
              >
                <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
                  {subtitle || "Welcome back"}
                </h2>
                <p className="text-neutral-500 mt-2 text-lg">Sign in to your account</p>
              </motion.div>

              <form className="space-y-5" onSubmit={handleLogin}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="peer w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 pt-6 pb-2 text-base font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-transparent"
                      placeholder="Email"
                      id="email-input"
                      required
                    />
                    <label
                      htmlFor="email-input"
                      className="absolute left-5 top-4 text-neutral-400 text-xs font-medium uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:text-neutral-500 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:uppercase peer-focus:font-bold peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-neutral-400"
                    >
                      Email Address
                    </label>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="peer w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 pt-6 pb-2 text-base font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-transparent"
                      placeholder="Password"
                      id="password-input"
                      required
                    />
                    <label
                      htmlFor="password-input"
                      className="absolute left-5 top-4 text-neutral-400 text-xs font-medium uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:text-neutral-500 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:uppercase peer-focus:font-bold peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-neutral-400"
                    >
                      Password
                    </label>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`w-full mt-6 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2
                    ${loading
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : loginStatus === 'success'
                        ? "bg-green-500 text-white"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]"
                    }`}
                >
                  {loading ? (
                    <Spinner size={24} className="text-neutral-400" />
                  ) : loginStatus === 'success' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Success!
                    </>
                  ) : (
                    "Sign In"
                  )}
                </motion.button>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 text-center"
              >
                <button className="text-neutral-500 font-medium text-sm hover:text-indigo-600 transition-colors">
                  Forgot your password?
                </button>
              </motion.div>
            </div>
          )}

          {/* Toast Component */}
          <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}