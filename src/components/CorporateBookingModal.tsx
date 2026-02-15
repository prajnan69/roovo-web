import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';
import { FiBriefcase, FiUsers } from 'react-icons/fi';
import RoovoLoader from './RoovoLoader';

interface CorporateBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    userPhone: string;
    userId: string;
}

const CorporateBookingModal: FC<CorporateBookingModalProps> = ({
    isOpen,
    onClose,
    userName,
    userPhone,
    userId,
}) => {
    const [companyName, setCompanyName] = useState('');
    const [numberOfPeople, setNumberOfPeople] = useState('');
    const [budgetPerHead, setBudgetPerHead] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        // Validate
        if (!companyName.trim()) {
            setErrorMessage('Company name is required');
            return;
        }
        if (!numberOfPeople || parseInt(numberOfPeople) <= 0) {
            setErrorMessage('Number of people is required');
            return;
        }
        if (!budgetPerHead || parseFloat(budgetPerHead) <= 0) {
            setErrorMessage('Budget per head is required');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        triggerHaptic();

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/corporate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userName,
                    userPhone,
                    companyName,
                    numberOfPeople: parseInt(numberOfPeople),
                    budgetPerHead: parseFloat(budgetPerHead),
                    totalBudget: parseInt(numberOfPeople) * parseFloat(budgetPerHead), // Auto-calculate
                }),
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to submit corporate booking request');
            }

            setStatus('success');
            setTimeout(() => {
                onClose();
                // Reset form
                setCompanyName('');
                setNumberOfPeople('');
                setBudgetPerHead('');
                setStatus('idle');
            }, 2000);
        } catch (error) {
            console.error('Error submitting corporate booking:', error);
            setStatus('error');
            setErrorMessage('Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-5 right-5 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-[101] shadow-2xl max-h-[85vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                                <FiBriefcase className="text-3xl text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">
                                Corporate Booking
                            </h2>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Roovo can handle complete end-to-end booking from traveling, venue to food at great prices! 🎯
                            </p>
                        </div>

                        {/* Status Messages */}
                        {status === 'success' && (
                            <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg flex items-center gap-2">
                                ✓ Request submitted successfully! Our team will contact you shortly.
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">
                                {errorMessage || 'Failed to submit. Please try again.'}
                            </div>
                        )}

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Company Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Company Name <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Enter company name"
                                        className="w-full pl-10 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Number of People */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Number of People <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        value={numberOfPeople}
                                        onChange={(e) => setNumberOfPeople(e.target.value)}
                                        placeholder="e.g., 50"
                                        min="1"
                                        className="w-full pl-10 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Budget Per Head */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Budget Per Head (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-semibold">₹</span>
                                    <input
                                        type="number"
                                        value={budgetPerHead}
                                        onChange={(e) => setBudgetPerHead(e.target.value)}
                                        placeholder="e.g., 5000"
                                        min="0"
                                        step="100"
                                        className="w-full pl-8 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || status === 'success'}
                                className="flex-1 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <RoovoLoader />
                                ) : status === 'success' ? (
                                    '✓ Submitted'
                                ) : (
                                    'Submit Request'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CorporateBookingModal;
