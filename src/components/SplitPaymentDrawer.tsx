import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, Phone, AlertCircle, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface SplitPaymentDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    onConfirm: (participants: string[]) => void;
    successData?: {
        splits: any[];
        groupId: string;
    } | null;
    onPayPrimary?: () => void;
}

export default function SplitPaymentDrawer({ isOpen, onClose, totalAmount, onConfirm, successData, onPayPrimary }: SplitPaymentDrawerProps) {
    const [participants, setParticipants] = useState<string[]>(['']); // Array of phone numbers, starting with one empty
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleAddParticipant = () => {
        triggerHaptic();
        if (participants.length >= 8) {
            setError("Maximum 8 participants allowed");
            return;
        }
        setParticipants([...participants, '']);
        setError(null);
    };

    const handleRemoveParticipant = (index: number) => {
        triggerHaptic();
        const newParticipants = participants.filter((_, i) => i !== index);
        setParticipants(newParticipants);
        setError(null);
    };

    const handlePhoneChange = (index: number, value: string) => {
        const newParticipants = [...participants];
        // Only allow numbers
        const cleanedValue = value.replace(/\D/g, '').slice(0, 10);
        newParticipants[index] = cleanedValue;
        setParticipants(newParticipants);
    };

    const handleConfirm = () => {
        triggerHaptic();
        // Validate all phones are 10 digits
        const validParticipants = participants.filter(p => p.length === 10);
        if (validParticipants.length < 1) {
            setError("Please enter at least one valid phone number to split with");
            return;
        }

        if (validParticipants.length !== participants.filter(p => p.trim() !== '').length) {
            setError("Please ensure all entered phone numbers are 10 digits");
            return;
        }

        onConfirm(validParticipants);
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        triggerHaptic();
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const splitAmount = totalAmount / (participants.filter(p => p.length === 10).length + 1);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-[70] p-6 shadow-2xl pb-10 max-h-[90vh] overflow-y-auto font-inter"
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                        {!successData ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                        <Users className="text-indigo-600" size={28} /> Split with Friends
                                    </h2>
                                    <button
                                        onClick={onClose}
                                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                                    >
                                        <X size={20} className="text-slate-600" />
                                    </button>
                                </div>

                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Amount per person</p>
                                            <p className="text-3xl font-black text-indigo-700">₹{splitAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total</p>
                                            <p className="text-sm font-bold text-indigo-600/70 line-through">₹{totalAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Participants (Phone Numbers)</h3>
                                    {participants.map((phone, index) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            key={index}
                                            className="relative flex items-center gap-3"
                                        >
                                            <div className="flex-1 relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Phone size={18} />
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => handlePhoneChange(index, e.target.value)}
                                                    placeholder="Enter phone number"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveParticipant(index)}
                                                className="p-4 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </motion.div>
                                    ))}

                                    <button
                                        onClick={handleAddParticipant}
                                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-500 transition-all active:scale-[0.98]"
                                    >
                                        <Plus size={20} /> Add Another Friend
                                    </button>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-start gap-3 mb-6"
                                    >
                                        <AlertCircle size={20} className="shrink-0" />
                                        <p className="text-sm font-medium">{error}</p>
                                    </motion.div>
                                )}

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-8">
                                    <div className="flex gap-3">
                                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                        <div className="space-y-1">
                                            <p className="text-[13px] font-bold text-amber-800">2-Hour Expiry Policy</p>
                                            <p className="text-xs text-amber-700 leading-relaxed">
                                                If the split is not completed by everyone within **2 hours**, the booking will fail. Paid amounts will be refunded **except for processing fees**.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirm}
                                    className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98]"
                                >
                                    Confirm Split Participants
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users size={40} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Split Initiated!</h2>
                                    <p className="text-slate-500 mt-2">WhatsApp messages have been sent to your friends. You can also copy and send the links manually.</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Payment Links</h3>
                                    {successData.splits.filter(s => !s.is_primary_payer).map((split, index) => {
                                        const shareUrl = `${window.location.origin}/split/pay?id=${split.id}`;
                                        const handleShare = async () => {
                                            triggerHaptic();
                                            const shareData = {
                                                title: 'Roovo — Pay Your Share',
                                                text: `You've been invited to split a booking on Roovo. Your share is ₹${split.amount_share}. Tap to pay:`,
                                                url: shareUrl,
                                            };
                                            if (navigator.share) {
                                                try { await navigator.share(shareData); } catch (_) { }
                                            } else {
                                                // Fallback: copy to clipboard
                                                navigator.clipboard.writeText(shareUrl);
                                                setCopiedIndex(index);
                                                setTimeout(() => setCopiedIndex(null), 2000);
                                            }
                                        };

                                        return (
                                            <div key={index} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                                <div className="flex justify-between items-center mb-3 text-sm">
                                                    <span className="font-bold text-slate-700">{split.participant_phone}</span>
                                                    <span className="font-black text-indigo-600">₹{split.amount_share}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs text-slate-400 truncate">
                                                        {shareUrl}
                                                    </div>
                                                    <button
                                                        onClick={() => { handleCopy(shareUrl, index); }}
                                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${copiedIndex === index
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                            }`}
                                                    >
                                                        {copiedIndex === index ? 'Copied!' : 'Copy'}
                                                    </button>
                                                    <button
                                                        onClick={handleShare}
                                                        className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                                        </svg>
                                                        Share
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl mb-8">
                                    <p className="text-sm font-bold text-indigo-900 mb-2 underline tracking-tight">Next Step:</p>
                                    <p className="text-xs text-indigo-700 leading-relaxed">
                                        You also need to pay your share of **₹{successData.splits.find(s => s.is_primary_payer)?.amount_share}** to confirm the split.
                                    </p>
                                </div>

                                <button
                                    onClick={onPayPrimary}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-900/20 transition-all active:scale-[0.98]"
                                >
                                    Pay My Share Now
                                </button>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
