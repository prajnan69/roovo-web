import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, ArrowRight, CreditCard } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface AcceptOfferDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    offer: {
        startDate: string;
        endDate: string;
        price: number;
    };
    listingTitle: string;
}

export default function AcceptOfferDrawer({ isOpen, onClose, onAccept, offer, listingTitle }: AcceptOfferDrawerProps) {
    const [isProcessing, setIsProcessing] = useState(false);

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
        await onAccept();
        setIsProcessing(false);
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
                                    GST is calculated dynamically based on the requested price per night (₹{pricePerNight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/night).
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
                                <>Pay & Book Now <CreditCard size={18} /></>
                            )}
                        </button>
                        <p className="text-center text-[10px] font-medium text-slate-400 mt-4 flex items-center justify-center gap-1 uppercase tracking-wider">
                            Powered by <span className="font-bold text-slate-500">Cashfree Payments</span>
                        </p>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
