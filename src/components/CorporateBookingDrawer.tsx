import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Briefcase, X, CheckCircle, Send, Users, Building2, Wallet } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { Spinner } from "./ui/shadcn-io/spinner";
import { useBackCloseable } from '@/hooks/useBackCloseable';

interface CorporateBookingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    userPhone: string;
    userId: string;
}

const CorporateBookingDrawer: React.FC<CorporateBookingDrawerProps> = ({
    isOpen,
    onClose,
    userName,
    userPhone,
    userId
}) => {
    // Hardware back closes the drawer instead of navigating
    useBackCloseable(isOpen, onClose);

    // Form State
    const [formData, setFormData] = useState({
        companyName: '',
        numberOfPeople: '',
        budgetPerHead: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Calculate total budget for display
    const totalBudget = useMemo(() => {
        const people = parseInt(formData.numberOfPeople) || 0;
        const budget = parseInt(formData.budgetPerHead) || 0;
        return people * budget;
    }, [formData.numberOfPeople, formData.budgetPerHead]);

    // Reset state when drawer opens
    useEffect(() => {
        if (isOpen) {
            setIsSubmitted(false);
            setErrorMessage(null);
            setFormData({
                companyName: '',
                numberOfPeople: '',
                budgetPerHead: ''
            });
        }
    }, [isOpen]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            triggerHaptic();
            onClose();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        triggerHaptic();
        setErrorMessage(null);

        // Basic Validation matching Backend requirements
        if (!formData.companyName || !formData.numberOfPeople || !formData.budgetPerHead) {
            setErrorMessage("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                userId,
                userName,
                userPhone,
                companyName: formData.companyName,
                numberOfPeople: parseInt(formData.numberOfPeople),
                budgetPerHead: parseInt(formData.budgetPerHead),
                totalBudget: totalBudget // Optional, but sending as backend accepts it
            };

            // Adjust URL to match your actual route definition for createCorporateLead
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/corporate-booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit request');
            }

            setIsSubmitted(true);
        } catch (error) {
            console.error('Corporate booking error:', error);
            setErrorMessage('Something went wrong. Please try again.');
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
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/60 z-[100]"
                        onClick={onClose}
                    />

                    {/* Drawer Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[2rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        {/* Drag Handle Area */}
                        <div className="w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-6 pb-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Corporate Booking</h2>
                                    <p className="text-xs text-slate-500">Business travel details</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 overflow-y-auto pb-safe-area-bottom">
                            {!isSubmitted ? (
                                <div className="space-y-6">
                                    {/* Info Banner */}
                                    <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-sm text-blue-800 flex flex-col gap-1">
                                        <p>
                                            Hi <strong>{userName}</strong>,
                                        </p>
                                        <p className="opacity-80 text-xs">
                                            Please provide the details below so our corporate team can create the best package for you.
                                        </p>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="space-y-4">
                                        {/* Company Name */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                <Building2 size={12} /> Company Name
                                            </label>
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Acme Corp"
                                                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Number of People */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                    <Users size={12} /> Guests
                                                </label>
                                                <input
                                                    type="number"
                                                    name="numberOfPeople"
                                                    value={formData.numberOfPeople}
                                                    onChange={handleInputChange}
                                                    placeholder="0"
                                                    min="1"
                                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
                                                />
                                            </div>

                                            {/* Budget Per Head */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                    <Wallet size={12} /> Budget Per Head
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                                                    <input
                                                        type="number"
                                                        name="budgetPerHead"
                                                        value={formData.budgetPerHead}
                                                        onChange={handleInputChange}
                                                        placeholder="0"
                                                        min="0"
                                                        className="w-full h-12 pl-8 pr-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total Estimate Display */}
                                        {totalBudget > 0 && (
                                            <div className="flex justify-between items-center bg-indigo-50 px-4 py-3 rounded-lg border border-indigo-100">
                                                <span className="text-xs font-semibold text-indigo-700 uppercase">Est. Total Budget</span>
                                                <span className="text-lg font-bold text-indigo-900">
                                                    ₹{totalBudget.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Error Message */}
                                    {errorMessage && (
                                        <div className="text-red-500 text-xs font-medium text-center bg-red-50 p-2 rounded-lg">
                                            {errorMessage}
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full h-14 bg-indigo-600 active:bg-indigo-800 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
                                    >
                                        {isSubmitting ? (
                                            <Spinner size={24} className="text-white" />
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Submit Requirement
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /* Success State */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-8 text-center space-y-4"
                                >
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2 shadow-sm">
                                        <CheckCircle size={40} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Request Sent!</h3>
                                    <div className="text-slate-500 max-w-xs mx-auto text-sm space-y-2">
                                        <p>
                                            Thank you, {userName}. We have received your request for <strong>{formData.companyName}</strong>.
                                        </p>
                                        <p className="text-slate-400 text-xs">
                                            An account manager will review your budget of ₹{totalBudget.toLocaleString('en-IN')} and contact you at {userPhone} shortly.
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="mt-6 px-10 h-12 bg-slate-900 text-white font-semibold rounded-full active:scale-95 transition-transform shadow-lg shadow-slate-900/20"
                                    >
                                        Close
                                    </button>
                                </motion.div>
                            )}

                            {/* Extra padding for safe area on mobile */}
                            <div className="h-6" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CorporateBookingDrawer;