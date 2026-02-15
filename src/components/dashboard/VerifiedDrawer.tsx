import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Home } from 'lucide-react';
import InfinityCheckLoader from '../InfinityCheckLoader';
import { supabase } from '../../services/api';

interface VerifiedDrawerProps {
    isOpen: boolean;
    listingId: string;
    listingTitle: string;
    listingImage?: string;
    onClose: () => void;
    onSuccess: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Declare Cashfree on window
declare global {
    interface Window {
        Cashfree: any;
    }
}

export default function VerifiedDrawer({
    isOpen,
    listingId,
    listingTitle,
    listingImage,
    onClose,
    onSuccess
}: VerifiedDrawerProps) {
    const [stayName, setStayName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Cashfree SDK
    useEffect(() => {
        const scriptId = 'cashfree-js-sdk';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.onload = () => {
                console.log('Cashfree SDK loaded');
            };
            document.body.appendChild(script);
        }
    }, []);

    // Fetch suggestions
    const [suggestions, setSuggestions] = useState<string[]>([]);
    useEffect(() => {
        const fetchSuggestions = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('listings_new')
                .select('stay_name')
                .eq('host_id', session.user.id)
                .eq('is_roovo_verified', true)
                .not('stay_name', 'is', null);

            if (data) {
                // Get unique names
                const uniqueNames = Array.from(new Set(data.map(item => item.stay_name))).filter(Boolean);
                setSuggestions(uniqueNames);
            }
        };

        if (isOpen) {
            fetchSuggestions();
        }
    }, [isOpen]);

    const handleSubscribe = async () => {
        if (!stayName.trim()) {
            setError('Please enter the name of your stay');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            // 1. Create Subscription Session
            const response = await fetch(`${API_BASE_URL}/api/subscriptions/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hostId: session.user.id,
                    listingId,
                    stayName: stayName.trim(),
                    email: session.user.email,
                    phone: session.user.phone,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Subscription initialization failed');
            }

            const data = await response.json();
            const { subscription_session_id } = data;

            if (!subscription_session_id) {
                throw new Error("Failed to get subscription session ID");
            }

            // 2. Trigger Cashfree Checkout
            if (!window.Cashfree) {
                throw new Error("Cashfree SDK not loaded");
            }

            const cashfree = new window.Cashfree({
                mode: "sandbox",
            });

            const checkoutOptions = {
                paymentSessionId: subscription_session_id,
                subsSessionId: subscription_session_id,
                redirectTarget: "_self",
            };

            cashfree.subscriptionsCheckout(checkoutOptions);

        } catch (err: any) {
            console.error('Subscription error:', err);
            setError(err.message || 'Failed to process subscription');
            setIsLoading(false);
        }
    };

    // Derived state for preview
    const displayName = stayName.trim() || "Your Stay Name";
    const isLongName = displayName.length > 20;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-[69] backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 top-[10vh] bg-white z-[70] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Get verified</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

                            {/* Live Preview Card */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Preview</span>

                                <div className="relative w-40 shrink-0 isolate">
                                    {/* Card Container with Premium Border */}
                                    <div className="rounded-2xl w-full aspect-square overflow-hidden p-[3px] bg-linear-to-tr from-[#FFD700] via-[#FCEDA5] to-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                                        <div className="w-full h-full rounded-[14px] overflow-hidden bg-white relative">
                                            {listingImage ? (
                                                <img src={listingImage} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                    <Home size={32} />
                                                </div>
                                            )}

                                            {/* Badge Overlay */}
                                            <div className="absolute top-1 left-1 z-10 custom-shadow">
                                                <div className="relative bg-[#FFD700] rounded-full p-0.5 shadow-[0_0_12px_rgba(255,223,0,0.7)] ring-1 ring-white/60 overflow-hidden w-6 h-6 flex items-center justify-center">
                                                    <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/50 to-transparent animate-pulse" />
                                                    <img src="/verified-gold.png" alt="Verified" className="relative z-10 w-4 h-4 object-contain" />
                                                </div>
                                            </div>

                                            <div className="absolute bottom-2 left-4 z-10 max-w-[calc(100%-24px)]">
                                                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/20 shadow-sm h-6 overflow-hidden">
                                                    <div className="relative h-4 min-w-[85px] max-w-full overflow-hidden flex items-center">
                                                        <div className="text-[10px] font-medium text-white leading-tight drop-shadow-sm absolute inset-0 flex items-center w-full">
                                                            <div className={`whitespace-nowrap w-full ${isLongName ? 'animate-marquee' : 'truncate'}`}>
                                                                {displayName}
                                                                {isLongName && <span className="pl-4">{displayName}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Benefits */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <CheckCircle2 className="text-indigo-500 w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">Official Verified Badge</h3>
                                        <p className="text-xs text-gray-500 mt-1">Displayed prominently on your listing</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <CheckCircle2 className="text-indigo-500 w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">Priority Support</h3>
                                        <p className="text-xs text-gray-500 mt-1">Direct access to our support team</p>
                                    </div>
                                </div>
                            </div>

                            {/* Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name of your Stay
                                </label>
                                <input
                                    type="text"
                                    value={stayName}
                                    onChange={(e) => setStayName(e.target.value)}
                                    maxLength={15}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Enter stay name (e.g. Cozy Retreat)"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    This name will be displayed on your verified badge pill.
                                </p>

                                {suggestions.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {suggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setStayName(suggestion)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-600 font-medium text-sm">Subscription fee</span>
                                <span className="text-xl font-bold text-gray-900">₹299<span className="text-sm font-normal text-gray-500">/mo</span></span>
                            </div>

                            <button
                                onClick={handleSubscribe}
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                            >
                                {isLoading ? (
                                    <>
                                        <InfinityCheckLoader isLoading={true} size="w-5 h-5" color="white" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    "Pay & Subscribe"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
