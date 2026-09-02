import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { 
    KeyRound, Wifi, ShieldCheck, AlertTriangle, Sparkles, Bell, 
    LogOut, Camera, Check, Copy, MapPin, Calendar, Clock, 
    User, ChevronRight, Lock, ArrowLeft, Phone, Share2, Info, Key 
} from 'lucide-react';
import { triggerHaptic, triggerErrorHaptic } from '@/lib/haptics';
import supabase from '@/services/api';
import RoovoLoader from '@/components/RoovoLoader';
import { useNavigation } from '@/hooks/useNavigation';
import Login from '@/components/Login';
import Toast from '@/components/ui/toast';
import { 
    RaiseIssueModal, 
    RequestCleaningModal, 
    ConciergeModal, 
    CheckOutModal 
} from './InStayModals';

interface SlideToCheckInProps {
    onSlide: () => Promise<boolean | void> | boolean | void;
    disabled?: boolean;
    isProcessing?: boolean;
    disabledReason?: string;
}

function SlideToCheckIn({ onSlide, disabled, isProcessing, disabledReason }: SlideToCheckInProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragBounds, setDragBounds] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            return Math.max(window.innerWidth - 48 - 64, 180);
        }
        return 220;
    });
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [isSuccess, setIsSuccess] = useState(false);

    const updateBounds = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const width = rect.width || containerRef.current.offsetWidth;
            if (width > 64) {
                // container width - handle width (52) - horizontal padding (6 * 2)
                setDragBounds(Math.max(width - 52 - 12, 100));
            }
        }
    }, []);

    useEffect(() => {
        updateBounds();
        const el = containerRef.current;
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && el) {
            ro = new ResizeObserver(() => updateBounds());
            ro.observe(el);
        }
        window.addEventListener('resize', updateBounds);
        window.addEventListener('orientationchange', updateBounds);

        const t1 = setTimeout(updateBounds, 100);
        const t2 = setTimeout(updateBounds, 400);

        return () => {
            if (ro && el) ro.unobserve(el);
            window.removeEventListener('resize', updateBounds);
            window.removeEventListener('orientationchange', updateBounds);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [updateBounds]);

    const textOpacity = useTransform(x, [0, Math.max(dragBounds * 0.4, 1)], [1, 0]);
    const activeTrackWidth = useTransform(x, (latest) => Math.max(latest + 52 + 12, 52 + 12));
    const activeBgColor = useTransform(
        x,
        [0, Math.max(dragBounds, 1)],
        ['#4f46e5', '#10b981'] // Indigo to Emerald
    );

    const completeSlide = async () => {
        if (disabled || isProcessing || isSuccess) return;
        setIsSuccess(true);
        await controls.start({ x: dragBounds, transition: { type: "spring", stiffness: 350, damping: 25 } });
        await triggerHaptic();
        try {
            const result = await onSlide();
            if (result === false) {
                throw new Error('Check-in was not completed');
            }
        } catch (err) {
            console.error('Check-in failed, resetting slider:', err);
            setIsSuccess(false);
            controls.start({ x: 0, transition: { type: "spring", stiffness: 450, damping: 25 } });
        }
    };

    const handleDragEnd = async (_: any, info: any) => {
        if (disabled || isProcessing || isSuccess) return;

        const currentX = x.get();
        const offset = info?.offset?.x || 0;
        const threshold = Math.max(dragBounds * 0.45, 50);

        if (currentX > threshold || offset > threshold) {
            await completeSlide();
        } else {
            await triggerHaptic();
            controls.start({ x: 0, transition: { type: "spring", stiffness: 450, damping: 25 } });
        }
    };

    if (disabled) {
        return (
            <div className="w-full h-[64px] rounded-full bg-slate-100 border border-slate-200 flex items-center px-2 py-1.5 opacity-80 cursor-not-allowed select-none">
                <div className="w-[50px] h-[50px] rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                    <Lock size={18} />
                </div>
                <div className="flex-1 text-center pr-10 text-xs font-bold text-slate-400">
                    {disabledReason || 'Upload photo above to unlock'}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            onClick={() => {
                if (!disabled && !isProcessing && !isSuccess) {
                    completeSlide();
                }
            }}
            style={{ touchAction: 'none' }}
            className={`relative w-full h-[64px] rounded-full flex items-center p-1.5 overflow-hidden transition-colors duration-500 select-none cursor-pointer touch-none ${
                isSuccess ? 'bg-emerald-500' : 'bg-slate-900 shadow-xl'
            }`}
        >
            {/* Sliding Color Track */}
            {!isSuccess && dragBounds > 0 && (
                <motion.div
                    className="absolute left-1.5 top-1.5 bottom-1.5 rounded-full z-0 shadow-sm pointer-events-none"
                    style={{
                        width: activeTrackWidth,
                        backgroundColor: activeBgColor,
                    }}
                />
            )}

            {/* Guide Text */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 pl-8"
                style={{ opacity: textOpacity }}
            >
                <span className="font-bold text-xs tracking-wider uppercase text-slate-200 flex items-center gap-1.5">
                    <span>Slide to Confirm Check-in</span>
                    <ChevronRight size={15} className="animate-pulse text-amber-300" />
                </span>
            </motion.div>

            {/* Draggable Handle */}
            <motion.div
                drag={!isProcessing && !isSuccess ? "x" : false}
                dragConstraints={{ left: 0, right: dragBounds }}
                dragElastic={0.08}
                dragMomentum={false}
                style={{ x, touchAction: 'none' }}
                animate={controls}
                onDragStart={() => {
                    updateBounds();
                    triggerHaptic();
                }}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled && !isProcessing && !isSuccess) {
                        completeSlide();
                    }
                }}
                className={`relative z-20 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 touch-none select-none ${
                    isSuccess
                        ? 'bg-white text-emerald-500 scale-105'
                        : 'bg-white text-indigo-600 cursor-grab active:cursor-grabbing hover:scale-[1.02]'
                }`}
            >
                {isProcessing ? (
                    <RoovoLoader className="w-10 h-auto" color="#4f46e5" />
                ) : isSuccess ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                        <Check className="w-6 h-6 text-emerald-600" strokeWidth={3} />
                    </motion.div>
                ) : (
                    <KeyRound className="w-5 h-5 text-indigo-600" />
                )}
            </motion.div>
        </div>
    );
}

interface CheckInPageProps {
    match?: any;
    id?: string;
    onOpenLogin?: (subtitle?: string, asDrawer?: boolean) => void;
}

export default function CheckInPage({ match, id: propId, onOpenLogin }: CheckInPageProps) {
    const checkInId = propId || match?.[1];
    const { navigate } = useNavigation();

    // Data State
    const [loading, setLoading] = useState(true);
    const [checkIn, setCheckIn] = useState<any>(null);
    const [listing, setListing] = useState<any>(null);
    const [host, setHost] = useState<any>(null);
    const [error, setError] = useState('');

    // Auth State
    const [sessionUser, setSessionUser] = useState<any>(null);
    const [resolvedUserPhone, setResolvedUserPhone] = useState<string>('');
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleTriggerLogin = async () => {
        await triggerHaptic();
        if (onOpenLogin) {
            onOpenLogin('Log in with your registered phone number', true);
        } else {
            setShowLoginModal(true);
        }
    };

    // 2-Step Guest Verification State (Aadhaar Real-time Masking + Live Selfie)
    const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
    const [uploadingSelfie, setUploadingSelfie] = useState(false);
    const [maskedAadhaarUrl, setMaskedAadhaarUrl] = useState<string | null>(null);
    const [aadhaarLast4, setAadhaarLast4] = useState<string | null>(null);
    const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);
    const [guestImageUrl, setGuestImageUrl] = useState<string | null>(null);

    // Check-in Slider & Animation State
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [showWelcomeCelebration, setShowWelcomeCelebration] = useState(false);

    // In-Stay Modals State
    const [activeModal, setActiveModal] = useState<'issue' | 'cleaning' | 'concierge' | 'checkout' | null>(null);

    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [wifiCopied, setWifiCopied] = useState(false);
    const [accessCodeCopied, setAccessCodeCopied] = useState(false);

    // Ensure body scroll is unblocked
    useEffect(() => {
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const copyAccessCode = async () => {
        if (!checkIn?.access_code) return;
        try {
            await navigator.clipboard.writeText(checkIn.access_code);
            setAccessCodeCopied(true);
            await triggerHaptic();
            setTimeout(() => setAccessCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    // Fetch Check-In Details with resilient fallback
    const loadCheckInDetails = async () => {
        setLoading(true);
        setError('');
        try {
            let loadedCheckIn: any = null;
            let loadedListing: any = null;
            let loadedHost: any = null;

            // 1. Try Backend API
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/${checkInId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.checkIn) {
                        loadedCheckIn = data.checkIn;
                        loadedListing = data.listing;
                        loadedHost = data.host;
                    }
                }
            } catch (apiErr) {
                console.warn('Backend fetch failed, falling back to direct Supabase query:', apiErr);
            }

            // 2. Direct Supabase Query Fallback
            if (!loadedCheckIn) {
                const { data: dbCheckIn, error: checkInError } = await supabase
                    .from('check_in_links')
                    .select('*')
                    .eq('id', checkInId)
                    .single();

                if (checkInError || !dbCheckIn) {
                    throw new Error('Check-in link not found or expired');
                }
                loadedCheckIn = dbCheckIn;

                // Fetch listing
                const { data: dbListing } = await supabase
                    .from('listings_new')
                    .select('id, title, name, host_id, place, city, public_address, images_data, house_rules')
                    .eq('id', dbCheckIn.listing_id)
                    .single();
                loadedListing = dbListing;

                // Fetch host
                const { data: dbHost } = await supabase
                    .from('profiles')
                    .select('id, name, avatar_url, phone')
                    .eq('id', dbCheckIn.host_id)
                    .single();
                loadedHost = dbHost;
            }

            setCheckIn(loadedCheckIn);
            setListing(loadedListing);
            setHost(loadedHost);
            if (loadedCheckIn?.guest_image_url) {
                try {
                    if (loadedCheckIn.guest_image_url.startsWith('{')) {
                        const parsed = JSON.parse(loadedCheckIn.guest_image_url);
                        setMaskedAadhaarUrl(parsed.aadhaar || null);
                        setAadhaarLast4(parsed.last4 || null);
                        setSelfieImageUrl(parsed.selfie || null);
                        setGuestImageUrl(parsed.selfie || parsed.aadhaar);
                    } else {
                        setGuestImageUrl(loadedCheckIn.guest_image_url);
                        setSelfieImageUrl(loadedCheckIn.guest_image_url);
                    }
                } catch {
                    setGuestImageUrl(loadedCheckIn.guest_image_url);
                }
            }
        } catch (err: any) {
            console.error('Failed to load check in:', err);
            setError(err.message || 'Check-in link not found or expired');
        } finally {
            setLoading(false);
        }
    };

    // Resolve Phone Number from all possible user sources
    const resolvePhoneForUser = async (user: any) => {
        if (!user) {
            setResolvedUserPhone('');
            return '';
        }

        let phone = user.phone || user.user_metadata?.phone || '';

        // 1. If phone is in email (e.g. 9876543210@roovo.in from OTP login)
        if (!phone && user.email && user.email.includes('@roovo.in')) {
            const digits = user.email.split('@')[0].replace(/\D/g, '');
            if (digits.length >= 10) {
                phone = digits;
            }
        }

        // 2. Query public.users table if phone is still empty
        if (!phone && user.id) {
            try {
                const { data: userData } = await supabase
                    .from('users')
                    .select('phone')
                    .eq('id', user.id)
                    .maybeSingle();

                if (userData?.phone) {
                    phone = userData.phone;
                }
            } catch (err) {
                console.warn('[CheckIn] Could not fetch phone from users table:', err);
            }
        }

        setResolvedUserPhone(phone);
        return phone;
    };

    // Check User Authentication
    const checkAuth = async () => {
        setIsAuthChecking(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setSessionUser(session.user);
                await resolvePhoneForUser(session.user);
            } else {
                setSessionUser(null);
                setResolvedUserPhone('');
            }
        } catch (e) {
            console.error('Auth check error:', e);
        } finally {
            setIsAuthChecking(false);
        }
    };

    useEffect(() => {
        if (checkInId) {
            loadCheckInDetails();
        }
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setSessionUser(session.user);
                await resolvePhoneForUser(session.user);
            } else {
                setSessionUser(null);
                setResolvedUserPhone('');
            }
        });

        return () => subscription.unsubscribe();
    }, [checkInId]);

    // Handle Phone Verification Check
    const cleanUserPhone = resolvedUserPhone.replace(/\D/g, '').slice(-10);
    const cleanGuestPhone = (checkIn?.guest_phone || '').replace(/\D/g, '').slice(-10);
    const isPhoneMatched = !cleanGuestPhone || (cleanUserPhone.length === 10 && cleanUserPhone === cleanGuestPhone);

    // Step 1: Handle Aadhaar Upload & Verification
    const handleAadhaarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            await triggerErrorHaptic();
            setToastMsg('Image is too large. Please select a photo under 10MB.');
            setShowToast(true);
            return;
        }

        setUploadingAadhaar(true);
        await triggerHaptic();

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/process-aadhaar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_base64: base64 }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await res.json();
                if (res.ok && data.maskedUrl && data.isAadhaar) {
                    setMaskedAadhaarUrl(data.maskedUrl);
                    setAadhaarLast4(data.last4 || 'XXXX');
                    await triggerHaptic();
                    setToastMsg(`Aadhaar verified! Now take a live selfie.`);
                    setShowToast(true);
                } else {
                    throw new Error(data.error || 'Please upload a clear photo of your Aadhaar card.');
                }
            } catch (err: any) {
                console.warn('Aadhaar verification error:', err);
                setMaskedAadhaarUrl(null);
                setAadhaarLast4(null);
                await triggerErrorHaptic();
                setToastMsg(err.message || 'Please upload a clear photo of your Aadhaar card.');
                setShowToast(true);
            } finally {
                setUploadingAadhaar(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // Step 2: Handle Live Selfie Upload
    const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            await triggerErrorHaptic();
            setToastMsg('Image is too large. Please select a photo under 10MB.');
            setShowToast(true);
            return;
        }

        setUploadingSelfie(true);
        await triggerHaptic();

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/upload-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_base64: base64,
                        aadhaar_data: {
                            masked_url: maskedAadhaarUrl,
                            last4: aadhaarLast4,
                        }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await res.json();
                if (res.ok && (data.imageUrl || data.selfieUrl)) {
                    setSelfieImageUrl(data.selfieUrl || data.imageUrl);
                    setGuestImageUrl(data.imageUrl);
                    await triggerHaptic();
                    setToastMsg('Selfie verified! Slide below to complete check-in.');
                    setShowToast(true);
                } else {
                    throw new Error(data.error || 'Failed to upload selfie');
                }
            } catch (err: any) {
                console.warn('Backend selfie upload fallback:', err);
                try {
                    const fallbackObj = JSON.stringify({
                        selfie: base64,
                        aadhaar: maskedAadhaarUrl,
                        last4: aadhaarLast4 || 'XXXX',
                        uploaded_at: new Date().toISOString(),
                    });
                    const { error: dbErr } = await supabase
                        .from('check_in_links')
                        .update({
                            guest_image_url: fallbackObj.length < 900000 ? fallbackObj : base64,
                            image_uploaded_at: new Date().toISOString()
                        })
                        .eq('id', checkInId);

                    if (!dbErr) {
                        setSelfieImageUrl(base64);
                        setGuestImageUrl(base64);
                        await triggerHaptic();
                        setToastMsg('Verification complete! Slide below to check in.');
                        setShowToast(true);
                        return;
                    }
                } catch (fallbackErr) {
                    console.error('Fallback error:', fallbackErr);
                }

                await triggerErrorHaptic();
                setToastMsg(err.message || 'Selfie upload failed. Please try again.');
                setShowToast(true);
            } finally {
                setUploadingSelfie(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const isVerificationComplete = Boolean(
        !checkIn?.require_image_upload ||
        (maskedAadhaarUrl && selfieImageUrl) ||
        (guestImageUrl && (!guestImageUrl.startsWith('{') || (maskedAadhaarUrl && selfieImageUrl)))
    );

    // Execute Check-In
    const handleCompleteCheckIn = async () => {
        if (checkIn?.require_image_upload && !isVerificationComplete) {
            await triggerErrorHaptic();
            setToastMsg('Please complete Aadhaar verification & live selfie before checking in');
            setShowToast(true);
            return false;
        }

        setIsCheckingIn(true);
        await triggerHaptic();

        try {
            let updatedCheckIn: any = null;

            // 1. Try Backend API
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guest_phone: cleanUserPhone || checkIn?.guest_phone })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.checkIn) {
                        updatedCheckIn = data.checkIn;
                    }
                }
            } catch (apiErr) {
                console.warn('Backend confirm error, falling back to direct Supabase update:', apiErr);
            }

            // 2. Direct Supabase Fallback
            if (!updatedCheckIn) {
                const { data: dbUpdated, error: updateErr } = await supabase
                    .from('check_in_links')
                    .update({
                        status: 'checked_in',
                        checked_in_at: new Date().toISOString()
                    })
                    .eq('id', checkInId)
                    .select()
                    .single();

                if (updateErr) throw updateErr;
                updatedCheckIn = dbUpdated;
            }

            if (updatedCheckIn) {
                setCheckIn(updatedCheckIn);
                // Trigger Luxury Welcome Animation Sequence
                setShowWelcomeCelebration(true);
                await triggerHaptic();
                setTimeout(() => {
                    setShowWelcomeCelebration(false);
                }, 4000);
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Check-in confirm error:', err);
            await triggerErrorHaptic();
            setToastMsg(err.message || 'Check-in error. Please try again.');
            setShowToast(true);
            return false;
        } finally {
            setIsCheckingIn(false);
        }
    };

    const copyWifi = async () => {
        if (!checkIn?.wifi_password) return;
        await triggerHaptic();
        try {
            await navigator.clipboard.writeText(checkIn.wifi_password);
            setWifiCopied(true);
            setTimeout(() => setWifiCopied(false), 2000);
        } catch (e) {
            console.error(e);
        }
    };

    const handleModalSuccess = (type: string, message: string, newRequest?: any) => {
        setToastMsg(message);
        setShowToast(true);
        if (newRequest) {
            setCheckIn((prev: any) => {
                if (!prev) return prev;
                const existing = Array.isArray(prev.requests) ? prev.requests : [];
                return {
                    ...prev,
                    requests: [newRequest, ...existing.filter((r: any) => r.id !== newRequest.id)],
                };
            });
        }
        loadCheckInDetails();
    };

    // Live real-time sync for guest: instantly see host replies & status changes
    useEffect(() => {
        if (!checkInId) return;

        const channel = supabase
            .channel(`guest_checkin_realtime_${checkInId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'check_in_links', filter: `id=eq.${checkInId}` },
                (payload) => {
                    if (payload.new) {
                        setCheckIn((prev: any) => ({ ...prev, ...payload.new }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [checkInId]);

    if (loading || isAuthChecking) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <RoovoLoader />
                <p className="text-xs font-semibold text-slate-400 mt-4 tracking-wider uppercase">Loading Check-in Portal</p>
            </div>
        );
    }

    if (error || !checkIn) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Check-in Unavailable</h2>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">{error || 'This check-in link is invalid or has expired.'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-200"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // ── 1. GUEST AUTHENTICATION LOCK ──
    if (!sessionUser) {
        return (
            <div className="min-h-dvh bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-6 relative overflow-hidden">
                {/* Ambient Glows */}
                <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

                {/* Top Brand Bar */}
                <div className="flex justify-between items-center z-10 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <KeyRound className="w-4 h-4 text-amber-300" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">Roovo In-Stay</span>
                    </div>

                    <button
                        onClick={handleTriggerLogin}
                        className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                    >
                        <User size={13} />
                        <span>Log in</span>
                    </button>
                </div>

                {/* Center Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="my-auto text-center space-y-5 z-10 max-w-sm mx-auto w-full py-6"
                >
                    <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 mx-auto flex items-center justify-center shadow-2xl">
                        <Lock className="w-9 h-9 text-amber-300" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-black tracking-tight font-display">Guest Check-in Portal</h1>
                        <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                            Welcome to <span className="font-semibold text-white">{listing?.title || 'your stay'}</span>. Please log in with your phone number to complete digital check-in.
                        </p>
                    </div>

                    {checkIn?.guest_phone && (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-slate-200">
                            <Phone size={13} className="text-amber-300" />
                            Registered for: +91 •••••••{checkIn.guest_phone.slice(-4)}
                        </div>
                    )}

                    {/* Prominent Center Login Button */}
                    <div className="pt-2">
                        <button
                            onClick={handleTriggerLogin}
                            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2.5 transition-all"
                        >
                            <Phone size={16} />
                            <span>Log in with Mobile OTP</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </motion.div>

                {/* Bottom Brand Note */}
                <div className="z-10 pb-4 text-center">
                    <p className="text-[11px] text-slate-400">
                        Secure instant check-in powered by Roovo
                    </p>
                </div>

                <Login
                    isOpen={showLoginModal}
                    onClose={() => setShowLoginModal(false)}
                    onLoginSuccess={() => {
                        setShowLoginModal(false);
                        checkAuth();
                    }}
                    title="Guest Login"
                    subtitle="Enter your mobile number to unlock your stay"
                    isDrawer={true}
                />
            </div>
        );
    }

    // ── 2. PHONE MISMATCH RESTRICTION ──
    if (!isPhoneMatched) {
        return (
            <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
                <p className="text-xs text-slate-600 mt-2 max-w-xs leading-relaxed">
                    This check-in link was issued for registered phone number ending in{' '}
                    <span className="font-bold text-slate-900">•{cleanGuestPhone.slice(-4)}</span>.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                    {cleanUserPhone ? `You are signed in as +91 ${cleanUserPhone}.` : 'Please log in with the registered guest phone number.'}
                </p>

                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        setSessionUser(null);
                        handleTriggerLogin();
                    }}
                    className="mt-6 w-full max-w-xs py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <Phone size={15} />
                    <span>Log in as Registered Guest</span>
                    <ChevronRight size={15} />
                </button>
            </div>
        );
    }

    // ── 3. LUXURY WELCOME CELEBRATION SEQUENCE ──
    if (showWelcomeCelebration) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col items-center justify-center p-6 text-center overflow-hidden"
            >
                {/* Floating ambient bursts */}
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute w-96 h-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none"
                />

                {/* Key Unlock Motion */}
                <motion.div
                    initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                    className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-400/30 mb-6"
                >
                    <KeyRound size={48} className="animate-bounce" />
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-widest">
                        <Sparkles size={13} /> Check-in Completed
                    </div>
                    <h1 className="text-3xl font-black tracking-tight font-display">Welcome Home!</h1>
                    <p className="text-sm text-slate-300 max-w-xs mx-auto">
                        Your stay at <span className="text-white font-semibold">{listing?.title}</span> is now active.
                    </p>
                </motion.div>
            </motion.div>
        );
    }

    const isAlreadyCheckedIn = checkIn.status === 'checked_in';
    const isCheckedOut = checkIn.status === 'checked_out';
    const firstImage = listing?.images_data?.[0]?.url || listing?.all_image_urls?.[0]?.url || '/placeholder-listing.png';

    return (
        <div className="w-full h-full min-h-dvh overflow-y-auto -webkit-overflow-scrolling-touch bg-[#FAF9F7] text-slate-900 pb-36">
            {/* Top Navigation */}
            <div className="sticky top-0 z-40 bg-[#FAF9F7]/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-200/60 flex items-center justify-between">
                <button
                    onClick={() => {
                        triggerHaptic();
                        if (window.history.length > 1) {
                            window.history.back();
                        } else {
                            navigate('/');
                        }
                    }}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white hover:bg-slate-50 active:scale-95 border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-md shrink-0 transition-all cursor-pointer"
                    aria-label="Back"
                >
                    <ArrowLeft size={19} className="text-slate-900 stroke-[3]" />
                </button>
                <div className="text-center px-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 block">Digital Check-in</span>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[200px] block">{listing?.title || 'Your Stay'}</span>
                </div>
                <div className="w-10 h-10" />
            </div>

            {/* Main Body */}
            <div className="px-5 pt-4 space-y-5 max-w-md mx-auto">

                {/* Property Hero Banner: Large only before check-in; compact after check-in */}
                {!isAlreadyCheckedIn ? (
                    <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl shadow-slate-200">
                        <div className="h-44 w-full relative">
                            <img src={firstImage} alt={listing?.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                            
                            <div className="absolute bottom-4 left-4 right-4">
                                <h2 className="text-lg font-bold font-display leading-tight line-clamp-1">{listing?.title}</h2>
                                <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                                    <MapPin size={12} className="text-indigo-400 shrink-0" />
                                    <span>{listing?.place || listing?.location?.city || 'Karnataka, India'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Stay Dates Bar */}
                        <div className="bg-slate-950/95 px-4 py-3 flex justify-between items-center text-xs border-t border-white/10">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-400" />
                                <span className="font-semibold text-slate-200">
                                    {checkIn.start_date ? new Date(checkIn.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Flexible'} 
                                    {' — '}
                                    {checkIn.end_date ? new Date(checkIn.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Flexible'}
                                </span>
                            </div>
                            {host?.name && (
                                <span className="text-[11px] text-slate-400">Host: <strong className="text-white">{host.name}</strong></span>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Active In-Stay Compact Header */
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                            <img src={firstImage} alt={listing?.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 truncate leading-snug">{listing?.title}</h2>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-indigo-500 shrink-0" />
                                <span className="truncate">{listing?.place || listing?.location?.city || 'India'}</span>
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-1">
                                {checkIn.start_date ? new Date(checkIn.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Flexible'}
                                {' — '}
                                {checkIn.end_date ? new Date(checkIn.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Flexible'}
                                {host?.name ? ` · Host: ${host.name}` : ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── PHASE 1: PRE-CHECK-IN VERIFICATION ── */}
                {!isAlreadyCheckedIn && !isCheckedOut && (
                    <div className="space-y-5">
                        {/* 2-Step Mandatory Verification Section */}
                        {checkIn.require_image_upload && (
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                                            isVerificationComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                            {isVerificationComplete ? <Check size={20} strokeWidth={3} /> : <ShieldCheck size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                {isVerificationComplete ? 'Identity Verified' : 'Guest Verification'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                                Upload your Aadhaar card and take a live selfie before check-in.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700">
                                        {isVerificationComplete ? '✓ Verified' : maskedAadhaarUrl ? 'Step 2 of 2' : 'Step 1 of 2'}
                                    </span>
                                </div>

                                {/* Step 1: Aadhaar Card (Upload or Capture) */}
                                <div className="p-4 rounded-2xl border bg-slate-50/70 border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                maskedAadhaarUrl ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                                            }`}>
                                                {maskedAadhaarUrl ? <Check size={13} strokeWidth={3} /> : '1'}
                                            </div>
                                            <span className="text-xs font-bold text-slate-800">Aadhaar Card</span>
                                        </div>
                                        {maskedAadhaarUrl && (
                                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                •••• •••• {aadhaarLast4 || 'XXXX'}
                                            </span>
                                        )}
                                    </div>

                                    {maskedAadhaarUrl ? (
                                        <div className="relative rounded-xl overflow-hidden border border-emerald-200 h-28 bg-slate-900 flex items-center justify-center">
                                            <img src={maskedAadhaarUrl} alt="Aadhaar Card" className="w-full h-full object-cover opacity-90" />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end justify-between p-2.5 text-white">
                                                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-mono font-bold">
                                                    XXXX-XXXX-{aadhaarLast4 || 'XXXX'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-xs text-[10px] font-bold flex items-center gap-1">
                                                    <Check size={11} strokeWidth={3} /> Verified
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 bg-white rounded-xl p-4 cursor-pointer hover:bg-indigo-50/50 transition-colors">
                                            {uploadingAadhaar ? (
                                                <div className="flex flex-col items-center justify-center py-2 gap-1.5">
                                                    <RoovoLoader className="w-12 h-auto" color="#4f46e5" />
                                                    <span className="text-[11px] font-semibold text-indigo-700">Verifying Aadhaar Card...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Camera className="w-6 h-6 text-indigo-600 mb-1" />
                                                    <span className="text-xs font-bold text-indigo-950">Upload or Snap Aadhaar Card</span>
                                                    <span className="text-[10px] text-slate-500 mt-0.5">Front photo of your card</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAadhaarUpload}
                                                        className="hidden"
                                                    />
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>

                                {/* Step 2: Live Selfie Capture */}
                                <div className={`p-4 rounded-2xl border transition-all ${
                                    !maskedAadhaarUrl ? 'opacity-50 pointer-events-none bg-slate-50/30 border-slate-200' : 'bg-slate-50/70 border-slate-200/80 space-y-3'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                selfieImageUrl ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                                            }`}>
                                                {selfieImageUrl ? <Check size={13} strokeWidth={3} /> : '2'}
                                            </div>
                                            <span className="text-xs font-bold text-slate-800">Live Selfie</span>
                                        </div>
                                        {selfieImageUrl && (
                                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Check size={11} strokeWidth={3} /> Captured
                                            </span>
                                        )}
                                    </div>

                                    {selfieImageUrl ? (
                                        <div className="relative rounded-xl overflow-hidden border border-emerald-200 h-28 bg-slate-900 flex items-center justify-center">
                                            <img src={selfieImageUrl} alt="Live Selfie" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                                                <Check size={11} strokeWidth={3} /> Selfie Verified
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 bg-white rounded-xl p-4 cursor-pointer hover:bg-indigo-50/50 transition-colors">
                                            {uploadingSelfie ? (
                                                <div className="flex flex-col items-center justify-center py-2 gap-1.5">
                                                    <RoovoLoader className="w-12 h-auto" color="#4f46e5" />
                                                    <span className="text-[11px] font-semibold text-indigo-700">Uploading selfie...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <User className="w-6 h-6 text-indigo-600 mb-1" />
                                                    <span className="text-xs font-bold text-indigo-950">Take Live Selfie</span>
                                                    <span className="text-[10px] text-slate-500 mt-0.5">Quick photo for check-in</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="user"
                                                        onChange={handleSelfieUpload}
                                                        className="hidden"
                                                    />
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Interactive Slide to Check In Slider */}
                        <div className="pt-2">
                            <SlideToCheckIn
                                onSlide={handleCompleteCheckIn}
                                disabled={Boolean(checkIn.require_image_upload && !isVerificationComplete)}
                                isProcessing={isCheckingIn}
                                disabledReason={!maskedAadhaarUrl ? "Upload Aadhaar card above to unlock" : !selfieImageUrl ? "Take live selfie above to unlock" : "Complete verification above to unlock"}
                            />
                        </div>
                    </div>
                )}

                {/* ── PHASE 2: ACTIVE IN-STAY CONCIERGE HUB ── */}
                {isAlreadyCheckedIn && (
                    <div className="space-y-4">
                        {/* Access & Wi-Fi Cards */}
                        {(() => {
                            const rawInst = checkIn.house_instructions || '';
                            const match = rawInst.match(/^\[Method:\s*([a-z_]+)\]\s*([\s\S]*)$/i);
                            const accessMethod = match ? match[1].toLowerCase() : (checkIn.access_code ? 'smart_lock' : 'caretaker');
                            const cleanInstructions = match ? match[2].trim() : rawInst;
                            const hasWifi = Boolean(checkIn.wifi_ssid || checkIn.wifi_password);

                            return (
                                <div className={`grid ${hasWifi ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                    {/* Wi-Fi Card - ONLY IF PROVIDED */}
                                    {hasWifi && (
                                        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    <Wifi size={14} className="text-indigo-600" /> Wi-Fi Network
                                                </div>
                                                {checkIn.wifi_ssid && (
                                                    <div className="text-xs font-bold text-slate-900 truncate">
                                                        {checkIn.wifi_ssid}
                                                    </div>
                                                )}
                                                {checkIn.wifi_password && (
                                                    <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                                                        {checkIn.wifi_password}
                                                    </div>
                                                )}
                                            </div>
                                            {checkIn.wifi_password && (
                                                <button
                                                    onClick={copyWifi}
                                                    className="mt-3 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-600 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                                >
                                                    {wifiCopied ? <Check size={13} /> : <Copy size={13} />}
                                                    <span>{wifiCopied ? 'Copied' : 'Copy Password'}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Door Access Card */}
                                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    {accessMethod === 'lockbox' ? (
                                                        <KeyRound size={14} className="text-amber-500" />
                                                    ) : accessMethod === 'caretaker' ? (
                                                        <Key size={14} className="text-emerald-500" />
                                                    ) : accessMethod === 'door_code' ? (
                                                        <ShieldCheck size={14} className="text-indigo-600" />
                                                    ) : (
                                                        <Lock size={14} className="text-indigo-600" />
                                                    )}
                                                    <span>
                                                        {accessMethod === 'lockbox'
                                                            ? 'Lockbox Safe'
                                                            : accessMethod === 'caretaker'
                                                            ? 'Key Handover'
                                                            : accessMethod === 'door_code'
                                                            ? 'Door PIN'
                                                            : 'Smart Lock'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Access
                                                </span>
                                            </div>

                                            {checkIn.access_code ? (
                                                <div className="text-base font-black text-slate-900 tracking-wider font-mono bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 inline-block select-all">
                                                    {checkIn.access_code}
                                                </div>
                                            ) : (
                                                <div className="text-xs font-bold text-slate-700">
                                                    {accessMethod === 'caretaker' ? 'Key with Caretaker' : 'Direct Entry'}
                                                </div>
                                            )}

                                            {cleanInstructions && (
                                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                                                    {cleanInstructions}
                                                </p>
                                            )}
                                        </div>

                                        {checkIn.access_code && (
                                            <button
                                                onClick={copyAccessCode}
                                                className="mt-3 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                            >
                                                {accessCodeCopied ? <Check size={13} /> : <Copy size={13} />}
                                                <span>{accessCodeCopied ? 'Code Copied' : 'Copy Code'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                        
                        {/* 4 Core In-Stay Guest Action Buttons */}
                        <div className="space-y-2.5 pt-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                                In-Stay Services & Requests
                            </h3>

                            {/* 1. Raise Issue */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerHaptic(); setActiveModal('issue'); }}
                                className="w-full p-4 rounded-3xl bg-white border border-rose-100 hover:border-rose-200 shadow-xs flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={22} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-900">Raise an Issue</div>
                                        <div className="text-xs text-slate-500">AC, plumbing, electrical, or cleanliness</div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </motion.button>

                            {/* 2. Request Cleaning */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerHaptic(); setActiveModal('cleaning'); }}
                                className="w-full p-4 rounded-3xl bg-white border border-indigo-100 hover:border-indigo-200 shadow-xs flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Sparkles size={22} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-900">Request Cleaning</div>
                                        <div className="text-xs text-slate-500">Fresh towels, linens, or room refresh</div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </motion.button>

                            {/* 3. Concierge Request */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerHaptic(); setActiveModal('concierge'); }}
                                className="w-full p-4 rounded-3xl bg-white border border-amber-100 hover:border-amber-200 shadow-xs flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                        <Bell size={22} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-900">Concierge Assistance</div>
                                        <div className="text-xs text-slate-500">Luggage, cabs, or local tips</div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </motion.button>

                            {/* 4. Express Check Out */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerHaptic(); setActiveModal('checkout'); }}
                                className="w-full p-4 rounded-3xl bg-slate-900 text-white shadow-md flex items-center justify-between transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                        <LogOut size={20} className="text-slate-200" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold">Express Check Out</div>
                                        <div className="text-xs text-slate-400">Key drop & departure checklist</div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </motion.button>
                        </div>

                        {/* ── GUEST ACTIVITIES & REQUESTS FEED ── */}
                        <div className="pt-3 space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={13} className="text-indigo-600" /> Stay Activity & Requests
                                </h3>
                                {Array.isArray(checkIn.requests) && checkIn.requests.length > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                        {checkIn.requests.length} {checkIn.requests.length === 1 ? 'Activity' : 'Activities'}
                                    </span>
                                )}
                            </div>

                            {Array.isArray(checkIn.requests) && checkIn.requests.length > 0 ? (
                                <div className="space-y-3">
                                    {checkIn.requests.map((req: any) => {
                                        const isIssue = req.type === 'issue';
                                        const isCleaning = req.type === 'cleaning';

                                        const statusStyle =
                                            req.status === 'resolved'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : req.status === 'in_progress'
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200';

                                        const statusLabel =
                                            req.status === 'resolved'
                                                ? 'Resolved'
                                                : req.status === 'in_progress'
                                                ? 'In Progress'
                                                : 'Pending Review';

                                        const formattedTime = req.created_at
                                            ? new Date(req.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                            : 'Just now';

                                        return (
                                            <div
                                                key={req.id}
                                                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2.5 transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                            isIssue ? 'bg-rose-50 text-rose-600' : isCleaning ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                            {isIssue ? <AlertTriangle size={16} /> : isCleaning ? <Sparkles size={16} /> : <Bell size={16} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-900">
                                                                {isIssue ? `Issue: ${req.category || 'Reported'}` : isCleaning ? 'Cleaning Requested' : 'Concierge Service'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {formattedTime}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                                                        {statusLabel}
                                                    </span>
                                                </div>

                                                {req.description && (
                                                    <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
                                                        {req.description}
                                                    </p>
                                                )}

                                                {req.time_slot && (
                                                    <div className="ml-10.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50/70 rounded-xl px-2.5 py-1 inline-block">
                                                        Requested Slot: {req.time_slot}
                                                    </div>
                                                )}

                                                {req.photo_url && (
                                                    <div className="ml-10.5 mt-1">
                                                        <a href={req.photo_url} target="_blank" rel="noreferrer" className="inline-block relative rounded-xl overflow-hidden border border-slate-200 w-28 h-20 group">
                                                            <img src={req.photo_url} alt="Attached photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        </a>
                                                    </div>
                                                )}

                                                {req.host_note && (
                                                    <div className="ml-10.5 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 space-y-0.5">
                                                        <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 block">Host Response</span>
                                                        <p className="leading-relaxed">{req.host_note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white/60 border border-dashed border-slate-200 rounded-3xl p-4 text-center">
                                    <p className="text-xs text-slate-400 font-medium">
                                        No active requests. Tap an option above if you need anything.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PHASE 3: CHECKED OUT COMPLETION ── */}
                {isCheckedOut && (
                    <div className="space-y-4">
                        <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                                <Check size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Stay Completed</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                    Thank you for staying with us at {listing?.title}. We hope to host you again soon!
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200"
                            >
                                Explore More Roovo Stays
                            </button>
                        </div>

                        {/* Also show past activities for checked out guests */}
                        {Array.isArray(checkIn.requests) && checkIn.requests.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                    <Clock size={13} className="text-indigo-600" /> Stay Activity History
                                </h3>
                                <div className="space-y-2.5">
                                    {checkIn.requests.map((req: any) => (
                                        <div key={req.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                                            <div className="flex justify-between items-center font-bold text-slate-800">
                                                <span>{req.category || req.type}</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500">{req.status}</span>
                                            </div>
                                            {req.description && <p className="text-slate-500">{req.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* In-Stay Action Drawers */}
            <RaiseIssueModal
                isOpen={activeModal === 'issue'}
                onClose={() => setActiveModal(null)}
                checkInId={checkInId}
                onSuccess={handleModalSuccess}
            />

            <RequestCleaningModal
                isOpen={activeModal === 'cleaning'}
                onClose={() => setActiveModal(null)}
                checkInId={checkInId}
                onSuccess={handleModalSuccess}
            />

            <ConciergeModal
                isOpen={activeModal === 'concierge'}
                onClose={() => setActiveModal(null)}
                checkInId={checkInId}
                onSuccess={handleModalSuccess}
            />

            <CheckOutModal
                isOpen={activeModal === 'checkout'}
                onClose={() => setActiveModal(null)}
                checkInId={checkInId}
                onSuccess={handleModalSuccess}
            />

            {/* Notification Toast */}
            <Toast
                isOpen={showToast}
                message={toastMsg}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
}
