import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Sparkles, Bell, LogOut, Camera, Check, Clock, Star, Info, Upload } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import RoovoLoader from '@/components/RoovoLoader';
import supabase from '@/services/api';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    checkInId: string;
    onSuccess: (type: string, message: string, requestData?: any) => void;
}

// ── 1. Raise Issue Modal ──
export function RaiseIssueModal({ isOpen, onClose, checkInId, onSuccess }: BaseModalProps) {
    const [category, setCategory] = useState('AC / Electrical');
    const [description, setDescription] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        'AC / Electrical',
        'Plumbing / Water',
        'Cleanliness',
        'Noise / Disturbance',
        'Wi-Fi / TV',
        'Appliances',
        'Key / Access',
        'Other'
    ];

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setImagePreview(base64);
            setImageBase64(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError('Please describe the issue');
            return;
        }

        setSubmitting(true);
        setError('');
        await triggerHaptic();

        try {
            let reqObj: any = null;
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'issue',
                        category,
                        description: description.trim(),
                        image_base64: imageBase64,
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    reqObj = data.request;
                }
            } catch (apiErr) {
                console.warn('Backend issue endpoint error, using direct Supabase write:', apiErr);
            }

            if (!reqObj) {
                const fallbackReq = {
                    id: `req_${Date.now()}`,
                    type: 'issue',
                    category,
                    description: description.trim(),
                    photo_url: imagePreview || null,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                };
                const { data: current } = await supabase.from('check_in_links').select('requests').eq('id', checkInId).single();
                const updated = [fallbackReq, ...(current?.requests || [])];
                await supabase.from('check_in_links').update({ requests: updated }).eq('id', checkInId);
                reqObj = fallbackReq;
            }

            await triggerHaptic();
            onSuccess('issue', 'Issue reported to host. They will attend to it shortly!', reqObj);
            onClose();
            setDescription('');
            setImagePreview(null);
            setImageBase64(null);
        } catch (err) {
            console.error('Submit issue error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
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
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 p-6 max-h-[85vh] overflow-y-auto shadow-2xl pb-10"
                    >
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <AlertTriangle size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Report an Issue</h2>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-xl mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Category selector */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => { triggerHaptic(); setCategory(cat); }}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                                category === cat
                                                    ? 'bg-rose-600 text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Details</label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe the issue in detail so the host can resolve it fast..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Attach Photo (Optional)</label>
                                {imagePreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 w-full h-36 bg-slate-100">
                                        <img src={imagePreview} alt="Issue preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => { setImagePreview(null); setImageBase64(null); }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                                        <Camera className="w-6 h-6 text-slate-400 mb-1" />
                                        <span className="text-xs font-semibold text-slate-600">Take a photo or upload from gallery</span>
                                        <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
                                    </label>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <RoovoLoader className="w-8 h-auto" color="#ffffff" />
                                ) : (
                                    'Submit Issue to Host'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── 2. Request Cleaning Modal ──
export function RequestCleaningModal({ isOpen, onClose, checkInId, onSuccess }: BaseModalProps) {
    const [timeSlot, setTimeSlot] = useState('Morning (9:00 AM - 12:00 PM)');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const slots = [
        'Morning (9:00 AM - 12:00 PM)',
        'Afternoon (12:00 PM - 3:00 PM)',
        'Evening (3:00 PM - 6:00 PM)',
    ];

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        await triggerHaptic();

        try {
            let reqObj: any = null;
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'cleaning',
                        time_slot: timeSlot,
                        description: notes.trim(),
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    reqObj = data.request;
                }
            } catch (apiErr) {
                console.warn('Backend cleaning request error, using direct Supabase write:', apiErr);
            }

            if (!reqObj) {
                const fallbackReq = {
                    id: `req_${Date.now()}`,
                    type: 'cleaning',
                    category: 'Cleaning',
                    time_slot: timeSlot,
                    description: notes.trim(),
                    status: 'pending',
                    created_at: new Date().toISOString(),
                };
                const { data: current } = await supabase.from('check_in_links').select('requests').eq('id', checkInId).single();
                const updated = [fallbackReq, ...(current?.requests || [])];
                await supabase.from('check_in_links').update({ requests: updated }).eq('id', checkInId);
                reqObj = fallbackReq;
            }

            await triggerHaptic();
            onSuccess('cleaning', 'Cleaning service requested. The housekeeping team will arrive in your requested slot!', reqObj);
            onClose();
            setNotes('');
        } catch (err) {
            console.error('Cleaning error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
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
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 p-6 max-h-[85vh] overflow-y-auto shadow-2xl pb-10"
                    >
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Sparkles size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Request Cleaning</h2>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-xl mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Preferred Time Slot</label>
                                <div className="space-y-2">
                                    {slots.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => { triggerHaptic(); setTimeSlot(s); }}
                                            className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                                                timeSlot === s
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={15} className={timeSlot === s ? 'text-indigo-600' : 'text-slate-400'} />
                                                <span>{s}</span>
                                            </div>
                                            {timeSlot === s && <Check size={16} className="text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Specific Instructions (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Change bed linens, extra trash bags, wash bathroom..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <RoovoLoader className="w-8 h-auto" color="#ffffff" />
                                ) : (
                                    'Confirm Cleaning Request'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── 3. Concierge Request Modal ──
export function ConciergeModal({ isOpen, onClose, checkInId, onSuccess }: BaseModalProps) {
    const [selectedTag, setSelectedTag] = useState('Extra Towels & Linens');
    const [customRequest, setCustomRequest] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const conciergeItems = [
        'Extra Towels & Linens',
        'Fresh Toiletries',
        'Luggage Storage',
        'Local Recommendations',
        'Late Checkout Inquiry',
        'Cab / Airport Taxi Booking',
        'Other Assistance'
    ];

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        await triggerHaptic();

        try {
            let reqObj: any = null;
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/${checkInId}/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'concierge',
                        category: selectedTag,
                        description: customRequest.trim() || selectedTag,
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    reqObj = data.request;
                }
            } catch (apiErr) {
                console.warn('Backend concierge request error, using direct Supabase write:', apiErr);
            }

            if (!reqObj) {
                const fallbackReq = {
                    id: `req_${Date.now()}`,
                    type: 'concierge',
                    category: selectedTag,
                    description: customRequest.trim() || selectedTag,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                };
                const { data: current } = await supabase.from('check_in_links').select('requests').eq('id', checkInId).single();
                const updated = [fallbackReq, ...(current?.requests || [])];
                await supabase.from('check_in_links').update({ requests: updated }).eq('id', checkInId);
                reqObj = fallbackReq;
            }

            await triggerHaptic();
            onSuccess('concierge', 'Concierge request sent to host!', reqObj);
            onClose();
            setCustomRequest('');
        } catch (err) {
            console.error('Concierge error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
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
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 p-6 max-h-[85vh] overflow-y-auto shadow-2xl pb-10"
                    >
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Bell size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Concierge Assistance</h2>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-xl mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">What do you need?</label>
                                <div className="flex flex-wrap gap-2">
                                    {conciergeItems.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => { triggerHaptic(); setSelectedTag(item); }}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                                selectedTag === item
                                                    ? 'bg-amber-500 text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Special Request / Message</label>
                                <textarea
                                    rows={3}
                                    placeholder="Add any specific details for your host..."
                                    value={customRequest}
                                    onChange={(e) => setCustomRequest(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <RoovoLoader className="w-8 h-auto" color="#ffffff" />
                                ) : (
                                    'Send Concierge Request'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── 4. Express Check Out Modal ──
export function CheckOutModal({ isOpen, onClose, checkInId, onSuccess }: BaseModalProps) {
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [checklistChecked, setChecklistChecked] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleCheckOut = async () => {
        setSubmitting(true);
        setError('');
        await triggerHaptic();

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
            const res = await fetch(`${apiBase}/api/check-in/${checkInId}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating,
                    feedback: feedback.trim(),
                })
            });

            if (res.ok) {
                await triggerHaptic();
                onSuccess('checkout', 'Thank you for staying! Check-out confirmed.');
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to complete check out');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
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
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 p-6 max-h-[90vh] overflow-y-auto shadow-2xl pb-10"
                    >
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                                    <LogOut size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Express Check Out</h2>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-xl mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Departure Checklist */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Departure Checklist</div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check size={14} className="text-emerald-500" />
                                    <span>Turn off air conditioning, heaters & lights</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check size={14} className="text-emerald-500" />
                                    <span>Lock main door & leave keys / lockbox closed</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check size={14} className="text-emerald-500" />
                                    <span>Check for all personal belongings</span>
                                </div>
                            </div>

                            {/* Rating Stars */}
                            <div className="text-center py-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">How was your stay?</label>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => { triggerHaptic(); setRating(star); }}
                                            className="p-1 transition-transform active:scale-125"
                                        >
                                            <Star
                                                size={28}
                                                className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Note for Host</label>
                                <textarea
                                    rows={2}
                                    placeholder="Leave a warm note or feedback for your host..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <button
                                onClick={handleCheckOut}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <RoovoLoader className="w-8 h-auto" color="#ffffff" />
                                ) : (
                                    'Confirm & Complete Check-Out'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
