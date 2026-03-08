import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import supabase from '@/services/api';

interface SplitStatusDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    splitData: any;
}

export default function SplitStatusDrawer({ isOpen, onClose, splitData }: SplitStatusDrawerProps) {
    const [currentUserPhone, setCurrentUserPhone] = useState<string>('');

    useEffect(() => {
        const getPhone = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            let phone = session.user.phone || session.user.user_metadata?.phone || '';

            if (!phone) {
                const { data } = await supabase
                    .from('users')
                    .select('phone')
                    .eq('id', session.user.id)
                    .single();
                if (data?.phone) phone = data.phone;
            }

            if (phone) {
                setCurrentUserPhone(phone);
            }
        };
        getPhone();
    }, []);

    if (!splitData) return null;

    const participants = splitData.all_participants || [];
    const myShare = participants.find((p: any) => p.participant_phone === currentUserPhone || p.participant_phone === currentUserPhone.replace('+91', ''));
    const isPaid = myShare?.status === 'paid';

    const bookingData = splitData.payment_intents?.booking_data || {};
    const totalAmount = bookingData.total_price || 0;
    const shareAmount = splitData.amount_share || 0;

    const handlePayNow = () => {
        triggerHaptic();
        // Redirect to the payment flow for this specific split
        window.location.href = `/split/pay?id=${splitData.id}`;
    };

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

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                    Split Payment Status
                                </h2>
                                <p className="text-sm text-slate-500 font-medium">
                                    {splitData.is_primary_payer
                                        ? (bookingData.listing_title || 'Upcoming Stay')
                                        : `Requested by ${splitData.initiator_name || (splitData.initiator_phone || '').replace(/\D/g, '').slice(-10)}`
                                    }
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X size={20} className="text-slate-600" />
                            </button>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <Users size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Group Progress</span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                                    {participants.filter((p: any) => p.status === 'paid').length} of {participants.length} Paid
                                </span>
                            </div>

                            <div className="w-full bg-indigo-200/50 h-2.5 rounded-full overflow-hidden mb-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(participants.filter((p: any) => p.status === 'paid').length / participants.length) * 100}%` }}
                                    className="bg-indigo-600 h-full rounded-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Participants</h3>
                            {participants.map((p: any, idx: number) => {
                                const isMe = p.participant_phone === currentUserPhone ||
                                    p.participant_phone.replace(/\D/g, '').slice(-10) === currentUserPhone.replace(/\D/g, '').slice(-10);

                                // Priority: "You" for current user, then DB name, then formatted phone
                                const formattedPhone = p.participant_phone.replace(/\D/g, '').slice(-10);
                                const displayName = isMe
                                    ? 'You'
                                    : (p.name || formattedPhone);

                                return (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${p.status === 'paid' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${p.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                {p.is_primary_payer ? '★' : idx + 1}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${p.status === 'paid' ? 'text-emerald-900' : 'text-slate-900'}`}>
                                                    {displayName} {isMe && !p.is_primary_payer && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded ml-1">YOU</span>}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-medium">₹{shareAmount.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        {p.status === 'paid' ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                                <CheckCircle2 size={16} /> Paid
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                                                <Circle size={16} /> Pending
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {!isPaid && (
                            <button
                                onClick={handlePayNow}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                Pay My Share (₹{shareAmount.toLocaleString('en-IN')}) <ArrowRight size={20} />
                            </button>
                        )}

                        {isPaid && (
                            <div className="text-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <p className="text-emerald-800 font-bold text-sm">You've paid your share! 🎉</p>
                                <p className="text-emerald-600 text-xs mt-1">Waiting for others to complete their payments.</p>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Total Booking Amount</span>
                                <span className="font-bold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Split Share ({participants.length} ways)</span>
                                <span className="font-bold text-slate-900">₹{shareAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
