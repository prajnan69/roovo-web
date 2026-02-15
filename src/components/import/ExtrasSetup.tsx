import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Ban, ArrowRight, ChevronLeft, AlertCircle } from "lucide-react";
import Toast from "../ui/toast";
import { triggerErrorHaptic } from "@/lib/haptics";

interface ExtrasData {
    extraGuest: {
        allowed: boolean;
        charge?: number;
    };
    cleaning: {
        hasCharge: boolean;
        chargePerDay?: number;
    };
    cancellationPolicy: 'flexible' | 'moderate' | 'firm' | 'strict';
}

interface ExtrasSetupProps {
    maxGuestCapacity: number;
    onNext: (data: ExtrasData) => void;
    onBack: () => void;
}

export default function ExtrasSetup({ maxGuestCapacity, onNext, onBack }: ExtrasSetupProps) {
    const [formData, setFormData] = useState<ExtrasData>({
        extraGuest: {
            allowed: false,
        },
        cleaning: {
            hasCharge: false,
        },
        cancellationPolicy: 'flexible',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        if (type === 'error') {
            triggerErrorHaptic();
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};

        // Validate extra guest charge if allowed
        if (formData.extraGuest.allowed && (!formData.extraGuest.charge || formData.extraGuest.charge <= 0)) {
            newErrors.extraGuestCharge = 'Please enter a valid charge amount';
        }

        // Validate cleaning charge if has charge
        if (formData.cleaning.hasCharge && (!formData.cleaning.chargePerDay || formData.cleaning.chargePerDay <= 0)) {
            newErrors.cleaningCharge = 'Please enter a valid cleaning charge';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast("Please fill in all required fields", "error");
            return;
        }

        onNext(formData);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-safe-bottom">
            {/* Header */}
            <div className="pt-[calc(env(safe-area-inset-top)+1rem)] px-5 pb-4 bg-white sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                        <span className="text-md font-bold border-1 ml-4 rounded-2xl py-1 px-3 text-indigo-500">Back</span>
                    </button>
                    <div className="text-sm font-bold text-gray-400">STEP 4 OF 5</div>
                </div>
                <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">Extras & Policies</h2>
                    <p className="text-gray-500 text-sm mt-1">Additional charges and booking policies</p>
                </div>
            </div>

            <div className="px-5 py-6 space-y-6 max-w-2xl mx-auto">
                {/* Section 1: Extra Guest Charges */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Sparkles size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Extra Guest Charges</h3>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-5">
                        <p className="text-sm text-blue-900 leading-relaxed">
                            <strong>Current capacity:</strong> {maxGuestCapacity} guests. Set charges for the {maxGuestCapacity + 1}th guest and beyond.
                        </p>
                    </div>

                    <div className="space-y-3 mb-5">
                        <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${!formData.extraGuest.allowed
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="extraGuest"
                                checked={!formData.extraGuest.allowed}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    extraGuest: { allowed: false },
                                }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Not Allowed</div>
                                <div className="text-xs text-gray-500 mt-0.5">Strictly {maxGuestCapacity} guests maximum</div>
                            </div>
                        </label>

                        <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.extraGuest.allowed
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="extraGuest"
                                checked={formData.extraGuest.allowed}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    extraGuest: { allowed: true, charge: prev.extraGuest.charge || 0 },
                                }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Allowed with charge</div>
                                <div className="text-xs text-gray-500 mt-0.5">Set per-guest charge</div>
                            </div>
                        </label>
                    </div>

                    {formData.extraGuest.allowed && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">
                                Charge per extra guest (per night) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                <input
                                    type="number"
                                    value={formData.extraGuest.charge || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extraGuest: { ...prev.extraGuest, charge: parseInt(e.target.value) || 0 },
                                    }))}
                                    placeholder="500"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-8 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            {errors.extraGuestCharge && <p className="text-red-500 text-xs mt-2 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.extraGuestCharge}</p>}
                        </motion.div>
                    )}
                </motion.div>

                {/* Section 2: Cleaning Charges */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <Sparkles size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Cleaning Charges</h3>
                    </div>

                    <div className="space-y-3 mb-5">
                        <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${!formData.cleaning.hasCharge
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="cleaning"
                                checked={!formData.cleaning.hasCharge}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    cleaning: { hasCharge: false },
                                }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">No extra cost</div>
                                <div className="text-xs text-gray-500 mt-0.5">Cleaning included in base price</div>
                            </div>
                        </label>

                        <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.cleaning.hasCharge
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="cleaning"
                                checked={formData.cleaning.hasCharge}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    cleaning: { hasCharge: true, chargePerDay: prev.cleaning.chargePerDay || 0 },
                                }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Per day charge</div>
                                <div className="text-xs text-gray-500 mt-0.5">Add cleaning fee per day</div>
                            </div>
                        </label>
                    </div>

                    {formData.cleaning.hasCharge && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">
                                Cleaning charge per day *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                <input
                                    type="number"
                                    value={formData.cleaning.chargePerDay || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        cleaning: { ...prev.cleaning, chargePerDay: parseInt(e.target.value) || 0 },
                                    }))}
                                    placeholder="200"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-8 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            {errors.cleaningCharge && <p className="text-red-500 text-xs mt-2 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.cleaningCharge}</p>}
                        </motion.div>
                    )}
                </motion.div>

                {/* Section 3: Cancellation Policy */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <Ban size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Cancellation Policy</h3>
                    </div>

                    <div className="space-y-3">
                        {/* Flexible */}
                        <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.cancellationPolicy === 'flexible'
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="cancellation"
                                checked={formData.cancellationPolicy === 'flexible'}
                                onChange={() => setFormData(prev => ({ ...prev, cancellationPolicy: 'flexible' }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Flexible</div>
                                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Full refund for cancellations up to 24 hours before check-in. Non-refundable afterwards.
                                </div>
                            </div>
                        </label>

                        {/* Moderate */}
                        <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.cancellationPolicy === 'moderate'
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="cancellation"
                                checked={formData.cancellationPolicy === 'moderate'}
                                onChange={() => setFormData(prev => ({ ...prev, cancellationPolicy: 'moderate' }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Moderate</div>
                                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Full refund for cancellations up to 5 days before check-in. Non-refundable afterwards.
                                </div>
                            </div>
                        </label>

                        {/* Firm */}
                        <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.cancellationPolicy === 'firm'
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="cancellation"
                                checked={formData.cancellationPolicy === 'firm'}
                                onChange={() => setFormData(prev => ({ ...prev, cancellationPolicy: 'firm' }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Firm</div>
                                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Full refund for cancellations up to 30 days before check-in. If booked between 30 and 14 days before check-in, full refund for 48 hours after booking.
                                </div>
                            </div>
                        </label>

                        {/* Strict */}
                        <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.cancellationPolicy === 'strict'
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <input
                                type="radio"
                                name="cancellation"
                                checked={formData.cancellationPolicy === 'strict'}
                                onChange={() => setFormData(prev => ({ ...prev, cancellationPolicy: 'strict' }))}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">Strict</div>
                                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Full refund for cancellations up to 14 days before check-in. Non-refundable afterwards.
                                </div>
                            </div>
                        </label>
                    </div>
                </motion.div>

                {/* Continue Button */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 bg-indigo-500 text-white transition-all"
                >
                    Continue to Verification
                    <ArrowRight size={20} />
                </motion.button>
            </div>
            {toast && (
                <Toast
                    message={toast.message}
                    isVisible={!!toast}
                    type={toast.type}
                    onClose={() => setToast(null)}
                    position="bottom"
                />
            )}
        </div>
    );
}
