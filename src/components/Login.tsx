"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "./ui/shadcn-io/spinner";
import RoovoLogo from "./RoovoLogo";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";
import Toast from './ui/toast';
import { useNavigation } from '@/hooks/useNavigation';
import { useBackCloseable } from '@/hooks/useBackCloseable';
import { API_BASE_URL, default as supabase } from "@/services/api";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

interface LoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  title?: string;
  subtitle?: string;
  redirectPath?: string;
  isDrawer?: boolean;
}

const slideVariants = {
  hidden: { y: "100%", opacity: 0.8 },
  visible: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0.8 },
};

// Global module-level store so verification ID is NEVER lost across re-renders,
// app backgrounding/resuming to check SMS, or component remounts.
let globalNativeVerificationId: string | null = null;
let globalConfirmationResult: ConfirmationResult | null = null;

// Attach a permanent native listener at module load so phoneCodeSent is never missed
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  try {
    FirebaseAuthentication.addListener('phoneCodeSent', (event: any) => {
      console.log('[Auth] Global phoneCodeSent received:', event?.verificationId);
      if (event?.verificationId) {
        globalNativeVerificationId = event.verificationId;
        try {
          sessionStorage.setItem('roovo_auth_vid', event.verificationId);
          localStorage.setItem('roovo_auth_vid', event.verificationId);
        } catch (e) {}
      }
    });

    FirebaseAuthentication.addListener('phoneVerificationFailed', (event: any) => {
      console.error('[Auth] Global phoneVerificationFailed:', event?.message);
    });
  } catch (e) {
    console.warn('[Auth] Could not attach global Firebase listener:', e);
  }
}

export default function Login({
  isOpen,
  onClose,
  onLoginSuccess,
  title,
  subtitle,
  redirectPath,
  isDrawer = false,
}: LoginProps) {
  // Hardware back closes the login overlay instead of navigating
  useBackCloseable(isOpen, onClose);

  // State
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [nativeVerificationId, setNativeVerificationId] = useState<string | null>(() => {
    return (
      globalNativeVerificationId ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roovo_auth_vid') : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('roovo_auth_vid') : null)
    );
  });

  // UI State
  const [isVisible, setIsVisible] = useState(isOpen);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { navigate } = useNavigation();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const confirmationResult = useRef<ConfirmationResult | null>(globalConfirmationResult);

  useEffect(() => {
    setIsVisible(isOpen);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (step !== 'otp') {
        resetState();
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      recaptchaVerifier.current?.clear();
      recaptchaVerifier.current = null;
    };
  }, []);

  useEffect(() => {
    let codeSentListener: any;
    let verificationCompletedListener: any;
    let verificationFailedListener: any;

    if (Capacitor.isNativePlatform()) {
      FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
        console.log('[Login] phoneCodeSent event received:', event?.verificationId);
        if (event?.verificationId) {
          globalNativeVerificationId = event.verificationId;
          setNativeVerificationId(event.verificationId);
          try {
            sessionStorage.setItem('roovo_auth_vid', event.verificationId);
            localStorage.setItem('roovo_auth_vid', event.verificationId);
          } catch (e) {}
        }
      }).then((res) => {
        codeSentListener = res;
      });

      FirebaseAuthentication.addListener('phoneVerificationCompleted', async (event) => {
        try {
          const { token } = await FirebaseAuthentication.getIdToken();
          if (token) {
            const response = await fetch(`${API_BASE_URL}/api/auth/firebase-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            });

            const data = await response.json();
            if (response.ok && data.session) {
              await supabase.auth.setSession(data.session);
              setLoginStatus('success');
              triggerHapticFeedback('success');
              setToastMessage("Login Successful!");
              setShowToast(true);
              setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                  onLoginSuccess();
                  if (redirectPath) navigate(redirectPath);
                }, 400);
              }, 1500);
            }
          }
        } catch (err) {
          console.error("Auto verification error:", err);
        }
      }).then((res) => {
        verificationCompletedListener = res;
      });

      FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
        console.error('Phone verification failed:', event.message);
        setError(event.message || 'Verification failed');
        setLoading(false);
      }).then((res) => {
        verificationFailedListener = res;
      });
    }

    return () => {
      if (codeSentListener) codeSentListener.remove();
      if (verificationCompletedListener) verificationCompletedListener.remove();
      if (verificationFailedListener) verificationFailedListener.remove();
    };
  }, [isOpen]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp') {
      if (timer > 0) {
        interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      } else if (timer === 0) {
        setCanResend(true);
      }
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const resetState = () => {
    setStep('phone');
    setPhoneNumber("");
    setOtp("");
    setError(null);
    setLoginStatus('idle');
    setLoading(false);
    setTimer(30);
    setCanResend(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 350);
  };

  /* standardized triggerHaptic now handles default duration and simplified success calls. 
     We can remove this local wrapper if we just call the imported functions directly, 
     or update this wrapper to use them. Wrapper logic: */
  const triggerHapticFeedback = async (type: 'success' | 'error') => {
    try {
      if (type === 'success') {
        await triggerHaptic();
      } else {
        await triggerErrorHaptic();
      }
    } catch (e) {
      console.error("Haptic feedback failed:", e);
    }
  };

  const getRecaptchaVerifier = () => {
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
    return recaptchaVerifier.current;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid mobile number");
      triggerHapticFeedback('error');
      return;
    }

    setLoading(true);

    try {
      if (Capacitor.isNativePlatform()) {
        FirebaseAuthentication.addListener('phoneCodeSent', (event: any) => {
          console.log('[Native phoneCodeSent event received]:', event?.verificationId);
          if (event?.verificationId) {
            globalNativeVerificationId = event.verificationId;
            setNativeVerificationId(event.verificationId);
            if (typeof window !== 'undefined') (window as any).__ROOVO_VID__ = event.verificationId;
            try {
              sessionStorage.setItem('roovo_auth_vid', event.verificationId);
              localStorage.setItem('roovo_auth_vid', event.verificationId);
            } catch (e) {}
          }
        }).catch(() => {});

        FirebaseAuthentication.addListener('phoneVerificationCompleted', async () => {
          console.log('[Native phoneVerificationCompleted]: Android auto-retrieval completed');
          try {
            const { token } = await FirebaseAuthentication.getIdToken();
            if (token) {
              await completeBackendLogin(token);
            }
          } catch (e) {
            console.warn('Auto verification completion error:', e);
          }
        }).catch(() => {});

        await FirebaseAuthentication.signInWithPhoneNumber({
          phoneNumber: `+91${phoneNumber}`,
        });
      } else {
        const verifier = getRecaptchaVerifier();
        const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, verifier);
        confirmationResult.current = result;
        globalConfirmationResult = result;
        if (typeof window !== 'undefined') (window as any).__ROOVO_CONFIRMATION__ = result;
      }

      setStep('otp');
      setTimer(30);
      setCanResend(false);
      setToastMessage("OTP Sent!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      if (!Capacitor.isNativePlatform()) {
        // Reset recaptcha on failure so user can retry
        recaptchaVerifier.current?.clear();
        recaptchaVerifier.current = null;
      }
      const msg = err.code === 'auth/invalid-phone-number'
        ? 'Invalid phone number'
        : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Failed to send OTP. Try again.';
      setError(msg);
      triggerHapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  const completeBackendLogin = async (idToken: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    if (data.session) {
      const { error: sessionError } = await supabase.auth.setSession(data.session);
      if (sessionError) console.error("Error setting session:", sessionError);
    }

    // Clear saved auth IDs on success
    globalNativeVerificationId = null;
    globalConfirmationResult = null;
    if (typeof window !== 'undefined') {
      delete (window as any).__ROOVO_VID__;
      delete (window as any).__ROOVO_CONFIRMATION__;
    }
    try {
      sessionStorage.removeItem('roovo_auth_vid');
      localStorage.removeItem('roovo_auth_vid');
    } catch (e) {}

    setLoginStatus('success');
    triggerHapticFeedback('success');
    setToastMessage("Login Successful!");
    setShowToast(true);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onLoginSuccess();
        if (redirectPath) navigate(redirectPath);
      }, 400);
    }, 1500);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      let idToken = "";

      if (Capacitor.isNativePlatform()) {
        // 1. Check if user is already authenticated via auto-retrieval / SMS Retriever
        try {
          const current = await FirebaseAuthentication.getCurrentUser();
          if (current?.user) {
            const { token } = await FirebaseAuthentication.getIdToken();
            if (token) {
              idToken = token;
            }
          }
        } catch (e) {
          console.warn('[Login] getCurrentUser check:', e);
        }

        // 2. If not already authenticated, find the active verification ID
        if (!idToken) {
          let vid =
            nativeVerificationId ||
            globalNativeVerificationId ||
            (typeof window !== 'undefined' ? (window as any).__ROOVO_VID__ : null) ||
            (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roovo_auth_vid') : null) ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('roovo_auth_vid') : null);

          // If still null, wait briefly (up to 2.5s) in case phoneCodeSent is in transit
          if (!vid) {
            for (let i = 0; i < 5 && !vid; i++) {
              await new Promise((r) => setTimeout(r, 500));
              vid =
                globalNativeVerificationId ||
                (typeof window !== 'undefined' ? (window as any).__ROOVO_VID__ : null) ||
                (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roovo_auth_vid') : null) ||
                (typeof localStorage !== 'undefined' ? localStorage.getItem('roovo_auth_vid') : null);
            }
          }

          if (vid) {
            await FirebaseAuthentication.confirmVerificationCode({
              verificationId: vid,
              verificationCode: otp,
            });
            const { token } = await FirebaseAuthentication.getIdToken();
            if (!token) throw new Error("Failed to retrieve ID Token");
            idToken = token;
          } else {
            // Check if web confirmation result exists as fallback
            const activeConfirmation =
              confirmationResult.current ||
              globalConfirmationResult ||
              (typeof window !== 'undefined' ? (window as any).__ROOVO_CONFIRMATION__ : null);

            if (activeConfirmation) {
              const credential = await activeConfirmation.confirm(otp);
              idToken = await credential.user.getIdToken();
            } else {
              setError("Session expired. Please request OTP again.");
              setStep('phone');
              setLoading(false);
              return;
            }
          }
        }
      } else {
        const activeConfirmation =
          confirmationResult.current ||
          globalConfirmationResult ||
          (typeof window !== 'undefined' ? (window as any).__ROOVO_CONFIRMATION__ : null);

        if (!activeConfirmation) {
          setError("Session expired. Please request OTP again.");
          setStep('phone');
          setLoading(false);
          return;
        }

        const credential = await activeConfirmation.confirm(otp);
        idToken = await credential.user.getIdToken();
      }

      await completeBackendLogin(idToken);

    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setLoginStatus('error');
      triggerHapticFeedback('error');
      const msg = err.code === 'auth/invalid-verification-code'
        ? 'Incorrect OTP. Please try again.'
        : err.code === 'auth/code-expired'
          ? 'OTP expired. Please request a new one.'
          : err.message || 'Invalid OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getLogoStatus = () => {
    if (loading) return 'loading';
    if (loginStatus === 'success') return 'success';
    if (loginStatus === 'error') return 'error';
    return 'idle';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop (Only for Drawer mode) */}
          {isDrawer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
              style={{ WebkitBackdropFilter: 'blur(2px)' }}
            />
          )}

          {/* Login Container */}
          <motion.div
            className={isDrawer
              ? "fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-50 shadow-2xl flex flex-col max-h-[92vh] pb-[calc(1.2rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100"
              : "fixed inset-0 z-50 bg-white/80 backdrop-blur-2xl text-neutral-900 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            }
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={slideVariants}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Grab Handle for Drawer */}
            {isDrawer && (
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
            )}

            {/* Header */}
            <div className={`flex items-center justify-end ${isDrawer ? 'px-6 py-2' : 'p-6'}`}>
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto w-full">
              <div className={isDrawer ? "flex flex-col py-4" : "min-h-full flex flex-col justify-center py-12"}>

              {/* Spacer */}
              <div className="flex-1"></div>

              <div className="px-8 max-w-md mx-auto w-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex justify-center mb-8"
                >
                  <div className="w-32 h-auto">
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
                    {step === 'phone' ? (subtitle || "Welcome back") : "Verify OTP"}
                  </h2>
                  <p className="text-neutral-500 mt-2 text-lg">
                    {step === 'phone' ? "Enter your mobile number to continue" : `Sent to +91 ${phoneNumber}`}
                  </p>
                </motion.div>

                <div className="space-y-5">

                  {step === 'phone' ? (
                    <motion.div
                      key="phone-input"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="relative group flex items-center">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-lg pointer-events-none">
                          +91
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) setPhoneNumber(val);
                          }}
                          className="peer w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-16 pr-5 py-4 h-14 text-lg font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-transparent"
                          placeholder="Mobile Number"
                          id="phone-input"
                          required
                        />
                        <label
                          htmlFor="phone-input"
                          className="absolute left-16 top-4 text-neutral-400 text-xs font-medium uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-lg peer-placeholder-shown:normal-case peer-placeholder-shown:text-neutral-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:uppercase peer-focus:font-bold peer-[&:not(:placeholder-shown)]:top-1 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-neutral-400"
                        >
                          Mobile Number
                        </label>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="otp-input"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="relative group">
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setOtp(val);
                          }}
                          className="peer w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 h-14 text-lg font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-transparent text-center tracking-[0.5em]"
                          placeholder="000000"
                          id="otp-input"
                          required
                          autoComplete="one-time-code"
                        />
                        <label
                          htmlFor="otp-input"
                          className="absolute left-0 right-0 top-4 text-center text-neutral-400 text-xs font-medium uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-lg peer-placeholder-shown:normal-case peer-placeholder-shown:text-neutral-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:uppercase peer-focus:font-bold peer-[&:not(:placeholder-shown)]:top-1 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-neutral-400"
                        >
                          Enter 6-digit OTP
                        </label>
                      </div>
                    </motion.div>
                  )}

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
                    type="button"
                    onClick={step === 'phone' ? handleSendOtp : handleVerifyOtp}
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
                      step === 'phone' ? "Get OTP" : "Verify & Login"
                    )}
                  </motion.button>
                </div>

                {step === 'otp' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 text-center"
                  >
                    {canResend ? (
                      <button
                        onClick={() => handleSendOtp()}
                        className="text-indigo-600 font-medium text-sm hover:text-indigo-700 transition-colors"
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <p className="text-neutral-400 text-sm">
                        Resend OTP in {timer}s
                      </p>
                    )}
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          globalNativeVerificationId = null;
                          globalConfirmationResult = null;
                          try {
                            sessionStorage.removeItem('roovo_auth_vid');
                            localStorage.removeItem('roovo_auth_vid');
                          } catch (e) {}
                          setNativeVerificationId(null);
                          if (confirmationResult) confirmationResult.current = null;
                          setStep('phone');
                        }}
                        className="text-neutral-500 font-medium text-sm hover:text-neutral-700 transition-colors"
                      >
                        Change Phone Number
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Legal Footer */}
              <div className="px-6 pb-6 pt-4 text-center">
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-neutral-400 font-medium">
                  <button onClick={() => navigate('/terms')} className="hover:text-neutral-600 transition-colors">Terms</button>
                  <span className="text-neutral-300">•</span>
                  <button onClick={() => navigate('/privacy-policy')} className="hover:text-neutral-600 transition-colors">Privacy</button>
                </div>
                <p className="text-[9px] text-neutral-300 text-center mt-2">
                  Roovo Hospitality Private Limited
                </p>
              </div>
            </div>
          </div>

          {/* Toast Component */}
          <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />

          {/* Invisible reCAPTCHA mount point for Firebase Phone Auth */}
          <div id="recaptcha-container" />
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
