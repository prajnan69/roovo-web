import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, DollarSign, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { useBackCloseable } from '@/hooks/useBackCloseable';

interface SendOfferDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (offerDetails: { startDate: string, endDate: string, price: number }) => void;
    guestName: string;
}

export default function SendOfferDrawer({ isOpen, onClose, onSend, guestName }: SendOfferDrawerProps) {
    // Hardware back closes the drawer instead of navigating
    useBackCloseable(isOpen, onClose);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [priceStr, setPriceStr] = useState('');

    const price = parseFloat(priceStr) || 0;

    // Nights Calculation
    const calculateNights = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };
    const nights = calculateNights();

    // Financial Math (Host Side)
    const roovoFee = price * 0.05;
    const gstOnFee = roovoFee * 0.18;
    const hostPayout = price - roovoFee - gstOnFee;

    const handleSend = () => {
        if (!startDate || !endDate || price <= 0 || nights <= 0) return;
        triggerHaptic();
        onSend({ startDate, endDate, price });
        onClose();
        // Reset
        setStartDate('');
        setEndDate('');
        setPriceStr('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        onClick={() => {
                            triggerHaptic();
                            onClose();
                        }}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl pb-10"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">Send Special Offer</h2>
                            <button onClick={() => { triggerHaptic(); onClose(); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                                <X size={20} className="text-slate-600" />
                            </button>
                        </div>

                        <p className="text-slate-500 text-sm mb-6">Create a custom booking offer for {guestName}. They will be able to review and pay securely here.</p>

                        <div className="space-y-5">
                            {/* Dates */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    <CalendarIcon size={14} /> Selected Dates
                                </label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[11px] font-medium text-slate-400 mb-1 block">Check-in</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[11px] font-medium text-slate-400 mb-1 block">Check-out</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <AnimatePresence>
                                {nights > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">
                                            <DollarSign size={14} /> Total Offer Price (₹) for {nights} Night{nights > 1 ? 's' : ''}
                                        </label>
                                        <input
                                            type="number"
                                            value={priceStr}
                                            onChange={(e) => setPriceStr(e.target.value)}
                                            placeholder={`e.g. ${(nights * 3000).toLocaleString('en-IN')}`}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Payout Breakdown */}
                            <AnimatePresence>
                                {price > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mt-2">
                                            <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-3">Host Payout Summary</h4>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center text-slate-600">
                                                    <span>Offer Price ({nights} nights)</span>
                                                    <span className="font-medium">₹{price.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>Roovo Fee (5%)</span>
                                                    <span>- ₹{roovoFee.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>GST on Fee (18%)</span>
                                                    <span>- ₹{gstOnFee.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                </div>

                                                <div className="h-px bg-indigo-100 my-2" />

                                                <div className="flex justify-between items-center text-indigo-900 font-bold text-base">
                                                    <span>You Earn</span>
                                                    <span>₹{hostPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleSend}
                                disabled={!startDate || !endDate || price <= 0 || nights <= 0}
                                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-[0.98]"
                            >
                                Send Offer to Guest <ArrowRight size={18} />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
