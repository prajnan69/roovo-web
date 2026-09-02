import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    KeyRound, Wifi, ShieldCheck, AlertTriangle, Sparkles, Bell, 
    LogOut, Camera, Check, Copy, MapPin, Calendar, Clock, 
    User, ChevronRight, Lock, ArrowLeft, Phone, Share2, Info 
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

    // Guest Upload State (Mandatory if host enabled)
    const [uploadingImage, setUploadingImage] = useState(false);
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
                setGuestImageUrl(loadedCheckIn.guest_image_url);
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

    // Handle Mandatory Guest Image Upload to Cloudflare R2
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        await triggerHaptic();

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/upload-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_base64: base64 })
                });

                const data = await res.json();
                if (res.ok && data.imageUrl) {
                    setGuestImageUrl(data.imageUrl);
                    await triggerHaptic();
                    setToastMsg('Photo verified & uploaded successfully!');
                    setShowToast(true);
                } else {
                    await triggerErrorHaptic();
                    setToastMsg(data.error || 'Failed to upload photo');
                    setShowToast(true);
                }
            } catch (err) {
                console.error('Upload photo error:', err);
                await triggerErrorHaptic();
                setToastMsg('Upload failed. Please try again.');
                setShowToast(true);
            } finally {
                setUploadingImage(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // Execute Check-In
    const handleCompleteCheckIn = async () => {
        if (checkIn?.require_image_upload && !guestImageUrl) {
            await triggerErrorHaptic();
            setToastMsg('Please upload your photo before checking in');
            setShowToast(true);
            return;
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
                    body: JSON.stringify({ guest_phone: cleanUserPhone })
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
            }
        } catch (err: any) {
            console.error('Check-in confirm error:', err);
            await triggerErrorHaptic();
            setToastMsg(err.message || 'Check-in error. Please try again.');
            setShowToast(true);
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

    const handleModalSuccess = (type: string, message: string) => {
        setToastMsg(message);
        setShowToast(true);
        loadCheckInDetails();
    };

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
        <div className="min-h-screen bg-[#FAF9F7] text-slate-900 pb-32">
            {/* Top Navigation */}
            <div className="sticky top-0 z-40 bg-[#FAF9F7]/90 backdrop-blur-md px-5 py-3.5 border-b border-slate-200/60 flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 block">Digital Check-in</span>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[180px] block">{listing?.title || 'Your Stay'}</span>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isAlreadyCheckedIn ? 'bg-emerald-100 text-emerald-700' : isCheckedOut ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'
                }`}>
                    {isAlreadyCheckedIn ? 'Active Stay' : isCheckedOut ? 'Checked Out' : 'Pre Check-in'}
                </div>
            </div>

            {/* Main Body */}
            <div className="px-5 pt-4 space-y-5 max-w-md mx-auto">

                {/* Property Hero Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl shadow-slate-200">
                    <div className="h-48 w-full relative">
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

                {/* ── PHASE 1: PRE-CHECK-IN VERIFICATION ── */}
                {!isAlreadyCheckedIn && !isCheckedOut && (
                    <div className="space-y-5">
                        {/* Mandatory Image Upload Section */}
                        {checkIn.require_image_upload && (
                            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                                        guestImageUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}>
                                        {guestImageUrl ? <Check size={20} /> : <Camera size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {guestImageUrl ? 'Guest Photo Verified' : 'Guest Verification (Mandatory)'}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                            The host requested a quick guest selfie / ID before check-in can be completed.
                                        </p>
                                    </div>
                                </div>

                                {guestImageUrl ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-emerald-200 h-36 bg-slate-100">
                                        <img src={guestImageUrl} alt="Verified guest" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                                            <Check size={12} /> Uploaded to Secure Cloud
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-5 cursor-pointer hover:bg-indigo-50/70 transition-colors">
                                        {uploadingImage ? (
                                            <div className="flex flex-col items-center gap-2 py-2">
                                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs font-semibold text-indigo-600">Uploading to Cloudflare R2...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Camera className="w-7 h-7 text-indigo-600 mb-1.5" />
                                                <span className="text-xs font-bold text-indigo-950">Tap to Take Selfie or Upload ID</span>
                                                <span className="text-[10px] text-indigo-600/80 mt-0.5">Secure, encrypted host storage</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="user"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>
                        )}

                        {/* Slide to Check In Button */}
                        <div className="pt-2">
                            <button
                                onClick={handleCompleteCheckIn}
                                disabled={isCheckingIn || (checkIn.require_image_upload && !guestImageUrl)}
                                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] ${
                                    checkIn.require_image_upload && !guestImageUrl
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                }`}
                            >
                                {isCheckingIn ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <KeyRound size={18} />
                                        <span>Slide to Confirm Check-in</span>
                                    </>
                                )}
                            </button>
                            {checkIn.require_image_upload && !guestImageUrl && (
                                <p className="text-[11px] text-center text-slate-400 mt-2">
                                    Upload photo above to unlock check-in
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PHASE 2: ACTIVE IN-STAY CONCIERGE HUB ── */}
                {isAlreadyCheckedIn && (
                    <div className="space-y-5">
                        {/* Access & Wi-Fi Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Wi-Fi Card */}
                            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        <Wifi size={14} className="text-indigo-600" /> Wi-Fi
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 truncate">
                                        {checkIn.wifi_ssid || 'Roovo-Guest'}
                                    </div>
                                    <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                                        {checkIn.wifi_password || 'welcome2026'}
                                    </div>
                                </div>
                                <button
                                    onClick={copyWifi}
                                    className="mt-3 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                >
                                    {wifiCopied ? <Check size={13} /> : <Copy size={13} />}
                                    <span>{wifiCopied ? 'Copied' : 'Copy Password'}</span>
                                </button>
                            </div>

                            {/* Door Access Card */}
                            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        <KeyRound size={14} className="text-amber-500" /> Door Code
                                    </div>
                                    <div className="text-sm font-black text-slate-900 tracking-wider font-mono">
                                        {checkIn.access_code || '4829'}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                        {checkIn.house_instructions || 'Keypad / smart lock'}
                                    </div>
                                </div>
                                <div className="mt-3 py-1.5 px-2 rounded-xl bg-slate-50 text-[10px] text-slate-500 text-center font-semibold">
                                    Private Access
                                </div>
                            </div>
                        </div>

                        {/* 4 Core In-Stay Guest Action Buttons */}
                        <div className="space-y-2.5">
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
                    </div>
                )}

                {/* ── PHASE 3: CHECKED OUT COMPLETION ── */}
                {isCheckedOut && (
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
