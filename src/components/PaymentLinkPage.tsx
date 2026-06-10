import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/api';
import RoovoLoader from '@/components/RoovoLoader';
import { triggerHaptic } from '@/lib/haptics';
import { Clock, ShieldCheck, Check, Calendar, Users, Star, MapPin } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import Toast from '@/components/ui/toast';
import dayjs from 'dayjs';

interface PaymentLinkPageProps {
    match: any;
    onOpenLogin?: (subtitle?: string) => void;
}

export default function PaymentLinkPage({ match, onOpenLogin }: PaymentLinkPageProps) {
    const linkId = match[1];
    const { navigate } = useNavigation();

    // Data State
    const [loading, setLoading] = useState(true);
    const [paymentLink, setPaymentLink] = useState<any>(null);
    const [listing, setListing] = useState<any>(null);
    const [error, setError] = useState('');
    
    // Auth & UI State
    const [bookingInFlight, setBookingInFlight] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch link details
    const loadDetails = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment-links/${linkId}`);
            const result = await response.json();
            
            if (response.ok) {
                setPaymentLink(result.paymentLink);
                setListing(result.listing);
                
                if (result.paymentLink.status === 'completed') {
                    setBookingSuccess(true);
                } else if (result.paymentLink.status === 'expired') {
                    setIsExpired(true);
                } else {
                    startTimer(result.paymentLink.expires_at);
                }
            } else {
                setError(result.error || 'Failed to load details');
            }
        } catch (err) {
            console.error('Error loading payment link:', err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [linkId]);

    // Timer Logic
    const startTimer = (expiresAtStr: string) => {
        const expiresAt = new Date(expiresAtStr).getTime();
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = expiresAt - now;

            if (distance < 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                setTimeLeft('Expired');
                setIsExpired(true);
                return;
            }

            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
    };

    // ✅ Core Booking Action
    const executeBooking = async (guestId: string) => {
        setBookingInFlight(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment-links/${linkId}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_id: guestId,
                    payment_method: 'link_payment'
                })
            });

            const result = await response.json();

            if (response.ok) {
                setBookingSuccess(true);
                setToastMsg('Booking Confirmed! 🎉');
                setShowToast(true);
            } else {
                setToastMsg(result.error || 'Failed to complete booking');
                setShowToast(true);
            }
        } catch (err) {
            console.error('Booking failed:', err);
            setToastMsg('Network error. Please try again.');
            setShowToast(true);
        } finally {
            setBookingInFlight(false);
        }
    };

    // Book Booking
    const handleBook = async () => {
        if (bookingInFlight || isExpired || bookingSuccess) return;

        triggerHaptic();

        // Check if guest is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            if (onOpenLogin) {
                sessionStorage.setItem('pending_booking_link_id', linkId);
                onOpenLogin("Log in to complete your booking reservation");
            }
            return;
        }

        await executeBooking(session.user.id);
    };

    // ✅ Automatically resume booking if the guest just signed in
    useEffect(() => {
        const checkPendingBooking = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const pendingLinkId = sessionStorage.getItem('pending_booking_link_id');
                if (pendingLinkId === linkId) {
                    sessionStorage.removeItem('pending_booking_link_id');
                    executeBooking(session.user.id);
                }
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user?.id) {
                const pendingLinkId = sessionStorage.getItem('pending_booking_link_id');
                if (pendingLinkId === linkId) {
                    sessionStorage.removeItem('pending_booking_link_id');
                    executeBooking(session.user.id);
                }
            }
        });

        checkPendingBooking();

        return () => {
            subscription.unsubscribe();
        };
    }, [linkId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-white">
                <RoovoLoader />
            </div>
        );
    }

    if (error || !paymentLink) {
        return (
            <div className="flex flex-col items-center justify-center h-screen px-6 text-center bg-slate-50">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 border border-rose-100">
                    <Clock size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Link Unavailable</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-xs">{error || 'This payment link does not exist.'}</p>
                <button 
                    onClick={() => navigate('/')} 
                    className="mt-6 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                >
                    Back to Explore
                </button>
            </div>
        );
    }

    const nights = dayjs(paymentLink.end_date).diff(dayjs(paymentLink.start_date), 'day');
    const imageToUse = (listing?.images_data && listing.images_data.length > 0) 
        ? (typeof listing.images_data[0] === 'string' ? listing.images_data[0] : listing.images_data[0]?.url)
        : '/logo.png';

    // Success Screen
    if (bookingSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center bg-white">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-100"
                >
                    <Check size={40} strokeWidth={3} />
                </motion.div>

                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Booking Confirmed!</h1>
                <p className="text-slate-500 mt-2 max-w-sm">
                    Your reservation for <b>{listing?.title}</b> has been locked and confirmed. You are good to go!
                </p>

                {/* Listing Details Card */}
                <div className="w-full max-w-md bg-slate-50 rounded-3xl border border-slate-200/60 p-4 mt-8 flex gap-4 text-left">
                    <img 
                        src={imageToUse} 
                        className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-slate-100 shadow-sm" 
                        alt={listing?.title} 
                    />
                    <div className="flex-1 py-0.5">
                        <h4 className="font-bold text-slate-900 line-clamp-1 leading-snug">{listing?.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{listing?.property_type} · {listing?.place}</p>
                        
                        <div className="flex gap-4 mt-3 text-xs font-bold text-indigo-600">
                            <span>{dayjs(paymentLink.start_date).format('D MMM')} - {dayjs(paymentLink.end_date).format('D MMM')}</span>
                            <span>{nights} night{nights > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-md mt-10 space-y-4">
                    <button 
                        onClick={() => navigate('/trips')} 
                        className="w-full bg-slate-900 hover:bg-black text-white py-4.5 rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
                    >
                        View My Trips
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-4.5 rounded-2xl font-bold transition-all active:scale-[0.98]"
                    >
                        Explore More Stays
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans pb-36">
            {/* Header Banner - Countdown Timer */}
            <div className={`sticky top-0 z-30 px-6 py-4.5 flex items-center justify-between text-white shadow-md transition-all ${
                isExpired 
                    ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                    : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/10'
            }`}>
                <div className="flex items-center gap-2.5">
                    <Clock size={16} className={isExpired ? "" : "text-indigo-400 animate-pulse"} />
                    <span className="text-xs font-bold tracking-wider uppercase">
                        {isExpired ? 'Offer Expired' : 'Special Offer Countdown'}
                    </span>
                </div>
                <span className={`text-xs font-black tracking-tight tabular-nums px-3 py-1 rounded-full ${
                    isExpired 
                        ? 'bg-rose-600/30 border border-rose-400/20 text-rose-200' 
                        : 'bg-indigo-500/20 border border-indigo-400/30 text-indigo-300'
                }`}>
                    {isExpired ? 'Expired' : timeLeft}
                </span>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-5 mt-2">
                {/* 1. Property Card */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                    <div className="h-60 relative bg-slate-100">
                        <img src={imageToUse} className="w-full h-full object-cover" alt={listing?.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                        {listing?.is_roovo_verified && (
                            <span className="absolute top-4 left-4 bg-emerald-500 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-full shadow-md tracking-wider uppercase">
                                Verified Stay
                            </span>
                        )}
                    </div>
                    <div className="p-6 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full tracking-wider uppercase">
                                {listing?.property_type}
                            </span>
                            {listing?.ratings_data?.value > 0 && (
                                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                    <Star size={12} fill="currentColor" />
                                    <span>{listing.ratings_data.value}</span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-snug">
                            {listing?.title}
                        </h1>
                        <p className="text-slate-500 text-xs flex items-center gap-1.5 font-medium">
                            <MapPin size={13} className="text-slate-400" />
                            {listing?.public_address || listing?.place}
                        </p>
                    </div>
                </div>

                {/* 2. Stay Details */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">Stay Itinerary</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check-In</span>
                            <p className="text-sm font-black text-slate-800">{dayjs(paymentLink.start_date).format('D MMM YYYY')}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">After 2:00 PM</p>
                        </div>
                        <div className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check-Out</span>
                            <p className="text-sm font-black text-slate-800">{dayjs(paymentLink.end_date).format('D MMM YYYY')}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Before 11:00 AM</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                <Users size={20} />
                            </div>
                            <div>
                                <span className="text-xs font-extrabold text-slate-900 block">{paymentLink.guests} Guest{paymentLink.guests > 1 ? 's' : ''}</span>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reservation occupancy</p>
                            </div>
                        </div>
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3.5 py-2 rounded-xl">
                            {nights} Night{nights > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* 3. Pricing Breakdown */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Price Summary</h3>
                    
                    <div className="flex justify-between items-center text-sm text-slate-500 font-medium">
                        <span>Stay charges ({nights} night{nights > 1 ? 's' : ''})</span>
                        <span className="font-bold text-slate-900">₹{Number(paymentLink.price).toLocaleString('en-IN')}</span>
                    </div>

                    {paymentLink.include_tax && (
                        <div className="flex justify-between items-center text-sm text-slate-500 font-medium">
                            <span>GST Tax (12%)</span>
                            <span className="font-bold text-slate-900">+ ₹{Number(paymentLink.tax_amount).toLocaleString('en-IN')}</span>
                        </div>
                    )}

                    <div className="h-px bg-slate-100 my-2" />

                    <div className="flex justify-between items-center text-slate-950 font-black text-lg">
                        <span>Total Price (INR)</span>
                        <span className="text-xl text-indigo-600 font-black">₹{Number(paymentLink.total_price).toLocaleString('en-IN')}</span>
                    </div>

                    {/* Trust badges */}
                    <div className="mt-4 p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                            Roovo Direct: Locked private invite stay. Verified & guaranteed lower than standard OTAs.
                        </span>
                    </div>
                </div>

                {/* 4. Action Booking Button (Sticky-Safe Bottom Layout) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1.2rem+env(safe-area-inset-bottom,0px))] bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-40">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleBook}
                            disabled={bookingInFlight || isExpired}
                            className={`w-full py-4.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-base font-inter ${
                                isExpired 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/15'
                            }`}
                        >
                            {bookingInFlight 
                                ? 'Confirming stay...' 
                                : isExpired 
                                    ? 'Stay Link Expired' 
                                    : 'Secure & Book Stay'
                            }
                        </button>
                    </div>
                </div>
            </div>

            <Toast message={toastMsg} isVisible={showToast} onClose={() => setShowToast(false)} />
        </div>
    );
}
