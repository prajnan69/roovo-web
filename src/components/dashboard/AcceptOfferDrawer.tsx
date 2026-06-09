import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CreditCard, Users, ShieldAlert } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import SplitPaymentDrawer from '../SplitPaymentDrawer';
import { API_BASE_URL } from '@/services/api';
import { createPaytmOrder, initiatePaytmCheckout } from '@/services/paytmService';

interface AcceptOfferDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    offer: {
        id: string; // Ensure ID is passed for intent
        startDate: string;
        endDate: string;
        price: number;
    };
    listingTitle: string;
    guestId: string;
    guestPhone: string;
    listingId: string;
    hostId: string;
}

export default function AcceptOfferDrawer({ isOpen, onClose, onAccept, offer, listingTitle, guestId, guestPhone, listingId, hostId }: AcceptOfferDrawerProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSplitEnabled, setIsSplitEnabled] = useState(false);
    const [isSplitDrawerOpen, setIsSplitDrawerOpen] = useState(false);
    const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
    const [splitSuccessData, setSplitSuccessData] = useState<any | null>(null);
    const [isPayingPrimary, setIsPayingPrimary] = useState(false);

    // Nights Calculation
    const calculateNights = () => {
        if (!offer.startDate || !offer.endDate) return 0;
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        const diffTime = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };
    const nights = calculateNights();

    // Financial Math (Guest Side)
    const pricePerNight = nights > 0 ? offer.price / nights : 0;
    const gstRate = pricePerNight < 7500 ? 0.12 : 0.18;
    const gstAmount = offer.price * gstRate;
    const totalAmount = offer.price + gstAmount;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleAccept = async () => {
        triggerHaptic();
        setIsProcessing(true);

        const totalToPay = totalAmount;

        try {
            if (isSplitEnabled && splitParticipants.length > 0) {
                // 1. Initiate Split
                const splitRes = await fetch(`${API_BASE_URL}/api/payment-splits/initiate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingData: {
                            listing_id: listingId,
                            guest_id: guestId,
                            host_id: hostId,
                            start_date: offer.startDate,
                            end_date: offer.endDate,
                            total_price: totalToPay,
                            host_payout: offer.price,
                            taxes: gstAmount,
                            our_fees: 0,
                            host_fees: 0,
                            status: 'pending',
                            offer_id: offer.id,
                            listing_title: listingTitle
                        },
                        participants: [guestPhone, ...splitParticipants],
                        primaryUserId: guestId,
                        totalAmount: totalToPay
                    })
                });

                if (!splitRes.ok) throw new Error("Split initiation failed");
                const splitData = await splitRes.json();
                setSplitSuccessData(splitData);
                // The SplitPaymentDrawer success view is handled by passing successData
            } else {
                await onAccept();
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred while processing the request.");
        }

        setIsProcessing(false);
    };

    const handlePayPrimaryShare = async () => {
        if (!splitSuccessData || isPayingPrimary) return;
        setIsPayingPrimary(true);
        triggerHaptic();

        try {
            const primaryShare = splitSuccessData.splits.find((s: any) => s.is_primary_payer);
            const orderAmount = primaryShare.amount_share;

            const bookingData = {
                listing_id: listingId,
                guest_id: guestId,
                host_id: hostId,
                start_date: offer.startDate,
                end_date: offer.endDate,
                total_price: totalAmount,
                host_payout: offer.price,
                taxes: gstAmount,
                our_fees: 0,
                host_fees: 0,
                status: 'pending',
                offer_id: offer.id,
                is_special_offer: true,
                auto_bookable: true
            };

            // Create Paytm order
            const order = await createPaytmOrder({
                order_amount: parseFloat(orderAmount.toFixed(2)),
                customer_details: {
                    customer_id: guestId,
                    customer_phone: guestPhone || '9999999999',
                    customer_name: 'Guest',
                    customer_email: 'guest@roovo.in',
                },
                order_meta: {
                    return_url: `${window.location.origin}/payment/status?order_id=ROOVO_PLACEHOLDER`,
                },
                bookingData,
            });

            // Update split record with the Paytm order ID
            await fetch(`${API_BASE_URL}/api/payment-splits/status/${primaryShare.id}/update-order`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: order.order_id })
            });

            localStorage.setItem(`pending_booking_${order.order_id}`, JSON.stringify(bookingData));

            // Open Paytm checkout
            await initiatePaytmCheckout(order);

        } catch (error: any) {
            console.error(error);
            if (!error?.message?.includes('cancelled')) {
                alert('Failed to initiate payment.');
            }
        } finally {
            setIsPayingPrimary(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
                        onClick={() => {
                            if (!isProcessing) {
                                triggerHaptic();
                                onClose();
                            }
                        }}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl pb-10 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="text-indigo-600" size={24} /> Review Offer
                            </h2>
                            <button
                                onClick={() => { if (!isProcessing) { triggerHaptic(); onClose(); } }}
                                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
                                disabled={isProcessing}
                            >
                                <X size={20} className="text-slate-600" />
                            </button>
                        </div>

                        <p className="text-slate-500 text-[15px] mb-6 leading-relaxed">
                            Your host has sent you a special offer for <strong>{listingTitle}</strong>. Review the details below and proceed to secure your booking.
                        </p>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Trip Details</h3>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Check-in</div>
                                    <div className="font-semibold text-slate-800">{formatDate(offer.startDate)}</div>
                                </div>
                                <div className="h-0.5 w-8 bg-slate-200 rounded-full"></div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Check-out</div>
                                    <div className="font-semibold text-slate-800">{formatDate(offer.endDate)}</div>
                                </div>
                            </div>
                            <div className="bg-indigo-50 text-indigo-700 text-xs font-bold py-2 px-3 rounded-lg inline-block">
                                {nights} Night{nights > 1 ? 's' : ''} Stay
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm mb-8">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Price Breakdown</h3>
                            <div className="space-y-3 text-[15px]">
                                <div className="flex justify-between items-center text-slate-700">
                                    <span>Special Offer Price</span>
                                    <span className="font-medium">₹{offer.price.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>Taxes ({(gstRate * 100).toFixed(0)}% GST)</span>
                                    <span>₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="h-px bg-slate-100 my-2" />
                                <div className="flex justify-between items-center text-slate-900 font-black text-xl">
                                    <span>Total (INR)</span>
                                    <span>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 text-right">
                                </p>
                            </div>
                        </div>

                        {/* Split Payment Toggle */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Split with Friends</h3>
                                        <p className="text-[11px] text-slate-500">Share the cost equally</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        triggerHaptic();
                                        if (!isSplitEnabled) {
                                            setIsSplitDrawerOpen(true);
                                        } else {
                                            setIsSplitEnabled(false);
                                            setSplitParticipants([]);
                                        }
                                    }}
                                    className={`w-12 h-6 rounded-full transition-all relative ${isSplitEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSplitEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {isSplitEnabled && (
                                <div className="bg-white rounded-xl p-3 border border-slate-100 mb-3">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>{splitParticipants.length + 1} People</span>
                                        <span className="font-bold text-indigo-600">₹{(totalAmount / (splitParticipants.length + 1)).toFixed(2)} / each</span>
                                    </div>
                                </div>
                            )}

                            <div className={`flex gap-3 p-3 rounded-xl transition-all ${isSplitEnabled ? 'bg-amber-50 border border-amber-100' : 'hidden'}`}>
                                <ShieldAlert className="text-amber-500 shrink-0" size={16} />
                                <p className="text-[10px] text-amber-700 leading-tight">
                                    Warning: If everyone doesn't pay within 2 hours, the amount will be refunded except for fees.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleAccept}
                            disabled={isProcessing}
                            className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20"
                        >
                            {isProcessing ? (
                                <>Processing Payment...</>
                            ) : (
                                <>{isSplitEnabled ? 'Apply Split & Pay share' : 'Pay & Book Now'} <CreditCard size={18} /></>
                            )}
                        </button>
                        <p className="text-center text-[10px] font-medium text-slate-400 mt-4 flex items-center justify-center gap-1 uppercase tracking-wider">
                            Powered by <span className="font-bold text-slate-500">Paytm</span>
                        </p>
                    </motion.div>

                    <SplitPaymentDrawer
                        isOpen={isSplitDrawerOpen}
                        onClose={() => {
                            setIsSplitDrawerOpen(false);
                        }}
                        totalAmount={totalAmount}
                        onConfirm={(participants) => {
                            setSplitParticipants(participants);
                            setIsSplitEnabled(true);
                            setIsSplitDrawerOpen(false);
                            triggerHaptic();
                        }}
                        successData={splitSuccessData}
                        onPayPrimary={handlePayPrimaryShare}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
