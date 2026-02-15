import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import InfinityCheckLoader from '../InfinityCheckLoader';
import { supabase } from '../../services/api';

interface SubscriptionModalProps {
    listingId: string;
    listingTitle: string;
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

export default function SubscriptionModal({ listingId, listingTitle, onClose, onSuccess }: SubscriptionModalProps) {
    const [stayName, setStayName] = useState(""); // Default empty as per requirement
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
                    phone: session.user.phone, // Assuming phone is available in user metadata if needed
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
                mode: "sandbox", // Switch to "production" in prod
            });

            const checkoutOptions = {
                paymentSessionId: subscription_session_id, // For basic payment, but for subscription it might be different?
                // Documentation says: "Use Subscription Session ID from the generated response to render the checkout page."
                // And calling `cashfree.checkout()` or `cashfree.subscriptionsCheckout()`?
                // Prompt says: "Steps: 1. Integrate Cashfree SDK 2. Initialize cashfree variable 3. Trigger Cashfree checkout()"
                // AND "cashfree.subscriptionsCheckout(checkoutOptions)" in the HTML example.
                subsSessionId: subscription_session_id,
                redirectTarget: "_self",
            };

            // Using subscriptionsCheckout as per prompt example
            cashfree.subscriptionsCheckout(checkoutOptions);

            // Note: browser will redirect, so we don't necessarily reach here if successful.
            // But if it's a popup (redirectTarget: "_popup"), we might. 
            // The prompt example uses "_self", so it will redirect.

        } catch (err: any) {
            console.error('Subscription error:', err);
            setError(err.message || 'Failed to process subscription');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                        <img src="/verified.png" alt="Verified" className="w-8 h-8 object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Roovo Verified</h2>
                    <p className="text-gray-500 text-sm">
                        Build trust with guests and boost bookings with the official verification badge.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Official Verified Badge</h3>
                            <p className="text-xs text-gray-500 mt-1">Displayed prominently on your listing</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Priority Support</h3>
                            <p className="text-xs text-gray-500 mt-1">Direct access to our support team</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name of your Stay
                    </label>
                    <input
                        type="text"
                        value={stayName}
                        onChange={(e) => setStayName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. Cozy Mountain Retreat"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        This name will be displayed on your verified listing.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 font-medium">Subscription fee</span>
                        <span className="text-xl font-bold text-gray-900">₹299<span className="text-sm font-normal text-gray-500">/mo</span></span>
                    </div>

                    <button
                        onClick={handleSubscribe}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
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
                    <p className="text-center text-xs text-gray-400 mt-3">
                        Cancel anytime from dashboard
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
