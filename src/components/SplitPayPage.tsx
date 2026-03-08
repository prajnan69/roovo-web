import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Loader2, AlertCircle, Users } from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { API_BASE_URL } from '../services/api';
import { triggerHaptic } from '@/lib/haptics';
import RoovoLoader from './RoovoLoader';

export default function SplitPayPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [splitData, setSplitData] = useState<any>(null);
    const [cashfree, setCashfree] = useState<any>(null);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            try {
                // 1. Load Cashfree SDK
                const cf = await load({
                    mode: import.meta.env.VITE_CASHFREE_MODE === "production" ? "production" : "sandbox"
                });
                setCashfree(cf);

                // 2. Get Split ID from URL
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');

                if (!id) {
                    setError("Missing payment ID");
                    setLoading(false);
                    return;
                }

                // 3. Fetch Split Details
                // We'll add a new endpoint or use an existing one if available
                const res = await fetch(`${API_BASE_URL}/api/payment-splits/share/${id}`);
                if (!res.ok) throw new Error("Could not find payment details");

                const data = await res.json();
                setSplitData(data);
                setLoading(false);
            } catch (err: any) {
                console.error("Split initialization error:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        initialize();
    }, []);

    const handlePay = async () => {
        if (!splitData || isPaying || !cashfree) return;
        setIsPaying(true);
        triggerHaptic();

        try {
            // 1. Create Cashfree Order for this specific share
            const orderRes = await fetch(`${API_BASE_URL}/api/cashfree/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_amount: splitData.amount_share,
                    customer_details: {
                        customer_id: `guest_${splitData.participant_phone}`,
                        customer_phone: splitData.participant_phone.replace(/\D/g, '').slice(-10),
                        customer_name: "Roovo Guest",
                        customer_email: "guest@roovo.in"
                    },
                    order_meta: {
                        return_url: `${window.location.origin}/payment/status?order_id={order_id}`
                    }
                })
            });

            if (!orderRes.ok) throw new Error("Failed to create payment link");
            const orderData = await orderRes.json();

            // 2. Update the split record with the order ID so the webhook can find it
            await fetch(`${API_BASE_URL}/api/payment-splits/status/${splitData.id}/update-order`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderData.order_id })
            });

            // 3. Trigger Cashfree Checkout
            await cashfree.checkout({
                paymentSessionId: orderData.payment_session_id,
                redirectTarget: "_self"
            });
        } catch (err: any) {
            console.error("Payment error:", err);
            alert("Payment failed to initialize: " + err.message);
            setIsPaying(false);
        }
    };

    if (loading) return <RoovoLoader />;

    if (error) {
        return (
            <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Oops! Something went wrong</h2>
                <p className="text-neutral-500 mb-6">{error}</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-black text-white rounded-xl font-bold"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const bookingTitle = splitData.payment_intents?.booking_data?.listing_title || "Your Trip";

    return (
        <div className="min-h-screen bg-neutral-50 font-inter pb-10">
            {/* Header */}
            <div className="bg-white border-b border-neutral-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => window.history.back()} className="p-2 hover:bg-neutral-100 rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-bold">Split Payment</h1>
            </div>

            <main className="max-w-md mx-auto p-5 space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-200"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Payment For</p>
                            <h2 className="text-xl font-bold text-neutral-900">{bookingTitle}</h2>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500">Your Phone</span>
                            <span className="font-semibold">{splitData.participant_phone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 text-sm">Amount to Pay</span>
                            <span className="text-2xl font-black text-indigo-600">₹{splitData.amount_share}</span>
                        </div>
                    </div>
                </motion.div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                    <ShieldCheck className="text-amber-500 shrink-0" size={20} />
                    <p className="text-xs text-amber-800 leading-relaxed">
                        This is a secure payment. Your share will be pooled with other participants to confirm the booking for <b>{bookingTitle}</b>.
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handlePay}
                        disabled={isPaying}
                        className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isPaying ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Initializing Secure Payment...
                            </>
                        ) : (
                            `Pay ₹${splitData.amount_share} Securely`
                        )}
                    </button>
                    <p className="text-center text-[10px] text-neutral-400 mt-4 uppercase tracking-widest px-8">
                        Powered by Cashfree • Secured with 128-bit encryption
                    </p>
                </div>
            </main>
        </div>
    );
}
