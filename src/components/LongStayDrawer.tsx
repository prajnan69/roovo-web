import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Calendar, X, CheckCircle, Send, Users, MapPin, Link as LinkIcon } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { Spinner } from "./ui/shadcn-io/spinner";
import { useGoogleMapsLoader } from '../lib/googleMaps';

interface LongStayDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    userPhone: string;
    userId: string;
}

const LongStayDrawer: React.FC<LongStayDrawerProps> = ({
    isOpen,
    onClose,
    userName,
    userPhone,
    userId
}) => {
    // Form State
    const [formData, setFormData] = useState({
        preferredStayUrl: '',
        area: '',
        days: '',
        guests: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [urlError, setUrlError] = useState<string | null>(null);

    // Google Maps Autocomplete
    const { isLoaded } = useGoogleMapsLoader();
    const areaInputRef = useRef<HTMLInputElement>(null);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    // Reset state when drawer opens
    useEffect(() => {
        if (isOpen) {
            setIsSubmitted(false);
            setErrorMessage(null);
            setFormData({
                preferredStayUrl: '',
                area: '',
                days: '',
                guests: ''
            });

            setFormData({
                preferredStayUrl: '',
                area: '',
                days: '',
                guests: ''
            });
        }
    }, [isOpen]);

    // Auto-close on success
    useEffect(() => {
        if (isSubmitted) {
            const timer = setTimeout(() => {
                onClose();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [isSubmitted, onClose]);

    // Initialize Google Maps Autocomplete
    useEffect(() => {
        if (isLoaded && areaInputRef.current && !autocomplete) {
            const initAutocomplete = async () => {
                try {
                    const { Autocomplete } = await window.google.maps.importLibrary("places") as any;
                    const autocompleteInstance = new Autocomplete(areaInputRef.current!, {
                        componentRestrictions: { country: 'in' },
                        fields: ['formatted_address', 'name'],
                    });

                    autocompleteInstance.addListener('place_changed', () => {
                        const place = autocompleteInstance.getPlace();
                        if (place && (place.formatted_address || place.name)) {
                            setFormData(prev => ({
                                ...prev,
                                area: place.formatted_address || place.name || ''
                            }));
                        }
                    });

                    setAutocomplete(autocompleteInstance);
                } catch (error) {
                    console.error('Error initializing Google Maps Autocomplete:', error);
                }
            };

            initAutocomplete();
        }
    }, [isLoaded, autocomplete]);



    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            triggerHaptic();
            onClose();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // Validate URL if it's the preferredStayUrl field
        if (name === 'preferredStayUrl') {
            if (value && !value.includes('roovo.in')) {
                setUrlError('URL must be from roovo.in domain');
            } else {
                setUrlError(null);
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        triggerHaptic();
        setErrorMessage(null);

        // Validation
        if (!formData.area || !formData.days || !formData.guests) {
            setErrorMessage("Please fill in all required fields.");
            return;
        }

        // Validate URL if provided
        if (formData.preferredStayUrl && !formData.preferredStayUrl.includes('roovo.in')) {
            setUrlError('URL must be from roovo.in domain');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                userId,
                userName,
                userPhone,
                preferredStayUrl: formData.preferredStayUrl || undefined,
                area: formData.area,
                days: parseInt(formData.days),
                guests: parseInt(formData.guests),
            };

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/long-stay`, {
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
            console.error('Long stay error:', error);
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
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Long Stay</h2>
                                    <p className="text-xs text-slate-500">Extended accommodation details</p>
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
                                    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 text-sm text-indigo-800 flex flex-col gap-1">
                                        <p>
                                            Hi <strong>{userName}</strong>,
                                        </p>
                                        <p className="opacity-80 text-xs">
                                            Tell us about your long stay requirements and we'll find the perfect place for you.
                                        </p>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="space-y-4">
                                        {/* Preferred Stay URL (Optional) */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                <LinkIcon size={12} /> Preferred Stay URL (Optional)
                                            </label>
                                            <input
                                                type="url"
                                                name="preferredStayUrl"
                                                value={formData.preferredStayUrl}
                                                onChange={handleInputChange}
                                                placeholder="https://roovo.in/listing/..."
                                                className={`w-full h-12 px-4 rounded-xl bg-slate-50 border ${urlError ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400`}
                                            />
                                            {urlError && (
                                                <p className="text-red-500 text-xs mt-1">{urlError}</p>
                                            )}
                                        </div>

                                        {/* Area (Mandatory - Google Maps) */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                <MapPin size={12} /> Area <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                ref={areaInputRef}
                                                type="text"
                                                name="area"
                                                value={formData.area}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Indiranagar, Bangalore"
                                                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Number of Days */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                    <Calendar size={12} /> Days <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="days"
                                                    value={formData.days}
                                                    onChange={handleInputChange}
                                                    placeholder="0"
                                                    min="1"
                                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
                                                />
                                            </div>

                                            {/* Guests */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                    <Users size={12} /> Guests <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="guests"
                                                    value={formData.guests}
                                                    onChange={handleInputChange}
                                                    placeholder="0"
                                                    min="1"
                                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>
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
                                            Thank you, {userName}. We have received your long stay request for <strong>{formData.area}</strong>.
                                        </p>
                                        <p className="text-slate-400 text-xs">
                                            An account manager will review your {formData.days}-day stay for {formData.guests} guest{formData.guests !== '1' ? 's' : ''} and contact you at {userPhone} shortly.
                                        </p>
                                    </div>

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

export default LongStayDrawer;
