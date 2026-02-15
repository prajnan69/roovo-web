import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Star, Calendar, CheckCircle2 } from "lucide-react";
import { triggerErrorHaptic } from "@/lib/haptics";

interface HostProfileConfirmationProps {
    hostData: {
        name?: string;
        profilePictureUrl?: string;
        isSuperhost?: boolean;
        hostingSince?: string;
        bio?: string[];
        reviewsCount?: number;
        responseRate?: string;
        responseTime?: string;
        averageRating?: number;
    };
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export default function HostProfileConfirmation({ hostData, onConfirm, onCancel }: HostProfileConfirmationProps) {
    const [name, setName] = useState(hostData.name || "");
    const [error, setError] = useState("");

    const handleConfirm = () => {
        if (!name.trim()) {
            setError("Name is required");
            triggerErrorHaptic();
            return;
        }
        onConfirm(name.trim());
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-3xl z-10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Complete Your Host Profile</h2>
                            <button
                                onClick={onCancel}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">We've pre-filled your profile with data from Airbnb</p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Profile Picture & Superhost Badge */}
                        <div className="flex items-center gap-4">
                            {hostData.profilePictureUrl ? (
                                <img
                                    src={hostData.profilePictureUrl}
                                    alt={hostData.name}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                    <User size={32} />
                                </div>
                            )}
                            <div className="flex-1">
                                {hostData.isSuperhost && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-semibold mb-2">
                                        <Star size={14} className="fill-current" />
                                        Top Host
                                    </div>
                                )}
                                {hostData.hostingSince && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Calendar size={14} />
                                        Hosting since {new Date(hostData.hostingSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                Your Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError("");
                                }}
                                placeholder="Enter your name"
                                className={`w-full bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-200'} rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all`}
                            />
                            {error && <p className="text-red-500 text-xs mt-2 ml-1">{error}</p>}
                        </div>

                        {/* Stats Grid */}
                        {(hostData.averageRating || hostData.responseRate) && (
                            <div className="grid grid-cols-2 gap-3">
                                {hostData.averageRating !== undefined && (
                                    <div className="bg-gray-50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <Star size={14} />
                                            Rating
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">{hostData.averageRating.toFixed(1)}</div>
                                    </div>
                                )}
                                {hostData.responseRate && (
                                    <div className="bg-gray-50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <CheckCircle2 size={14} />
                                            Response Rate
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">{hostData.responseRate}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bio */}
                        {hostData.bio && hostData.bio.length > 0 && (
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    About You
                                </label>
                                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 space-y-2">
                                    {hostData.bio.map((paragraph, index) => (
                                        <p key={index}>{paragraph}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-3xl space-y-3">
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleConfirm}
                            className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                        >
                            Confirm & Continue
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
