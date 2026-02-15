import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { completeUserProfile } from '@/services/api';
import { triggerHaptic } from '@/lib/haptics';

interface ProfileCompletionModalProps {
    isOpen: boolean;
    userId: string;
    currentName?: string | null;
    currentEmail?: string | null;
    currentGender?: string | null;
    currentDob?: string | null;
    onComplete: () => void;
}

const ProfileCompletionModal: FC<ProfileCompletionModalProps> = ({
    isOpen,
    userId,
    currentName,
    currentEmail,
    currentGender,
    currentDob,
    onComplete,
}) => {
    const [name, setName] = useState(currentName || '');
    const [email, setEmail] = useState(currentEmail || '');
    const [gender, setGender] = useState(currentGender || '');
    const [dob, setDob] = useState(currentDob || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        // Validate required fields
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        if (!gender) {
            setError('Gender is required');
            return;
        }
        if (!dob) {
            setError('Date of birth is required');
            return;
        }

        setIsSaving(true);
        setError('');
        triggerHaptic();

        try {
            await completeUserProfile(userId, {
                name: name.trim(),
                email: email.trim() || undefined,
                gender,
                dob,
            });

            onComplete();
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - non-dismissible */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-5 right-5 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-[101] shadow-2xl max-h-[80vh] overflow-y-auto"
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-3xl">👤</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">
                                Complete Your Profile
                            </h2>
                            <p className="text-sm text-slate-500">
                                We need a few more details to get you started
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Name - Required */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>

                            {/* Email - Optional */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Email <span className="text-slate-400 text-xs">(Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>

                            {/* Gender - Required */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Gender <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Male', 'Female', 'Other'].map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                setGender(option);
                                                triggerHaptic();
                                            }}
                                            className={`p-3 rounded-xl text-sm font-semibold transition-all ${gender === option
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date of Birth - Required */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Date of Birth <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving || !name.trim() || !gender || !dob}
                            className="w-full mt-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Continue'
                            )}
                        </button>

                        <p className="text-xs text-slate-400 text-center mt-4">
                            * Required fields
                        </p>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfileCompletionModal;
