import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Upload, CheckCircle2, FileVideo, AlertCircle, Shield, ChevronLeft, Play } from "lucide-react";
import confetti from "canvas-confetti";
import { uploadVideoToSupabase, validateVideoFile, compressVideo } from "@/utils/videoConverter";
import { captureIpAddress, getCurrentTimestamp } from "@/utils/ipCapture";
import Toast from "../ui/toast";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";
import InfinityCheckLoader from "../InfinityCheckLoader";

interface LegalData {
    videoHomeTour?: {
        url: string;
        uploadedAt: string;
    };
    ownershipWarranty: {
        accepted: boolean;
        timestamp: string;
        ipAddress: string;
    };
}

interface VerificationStepProps {
    hostId: string;
    onComplete: (data: LegalData) => void;
    onBack: () => void;
    draftSaved?: boolean;
    onNavigateToListings?: () => void;
    initialLegalData?: LegalData;
}

const LEGAL_TEXT = `
I hereby warrant and confirm that:

1. I am the legal owner or authorized representative of the property listed.
2. I have the right to list this property on Roovo for short-term rentals.
3. All information provided is accurate and truthful to the best of my knowledge.
4. I understand that providing false information may result in legal action and account termination.
5. I agree to comply with all local laws and regulations regarding short-term rentals.
6. I authorize Roovo to verify the ownership details provided.

By checking this box, I acknowledge that I have read, understood, and agree to the above warranty.
`;

export default function VerificationStep({ hostId, onComplete, onBack, draftSaved = false, onNavigateToListings, initialLegalData }: VerificationStepProps) {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [warrantyAccepted, setWarrantyAccepted] = useState(initialLegalData?.ownershipWarranty?.accepted || false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        if (type === 'error') {
            triggerErrorHaptic();
        } else {
            triggerHaptic();
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateVideoFile(file);
        if (!validation.valid) {
            setErrors({ video: validation.error || 'Invalid video file' });
            showToast(validation.error || 'Invalid video file', 'error');
            return;
        }

        setErrors({});
        setVideoFile(file);
    };

    const handleVideoUpload = async () => {
        if (!videoFile) return;

        setIsUploading(true);
        setIsOptimizing(true); // Start optimization
        setUploadProgress(0);

        try {
            showToast("Optimizing video...", "success");

            // Compress video
            let fileToUpload = videoFile;
            try {
                // Determine if optimization is needed based on file size
                if (videoFile.size > 10 * 1024 * 1024) { // Only optimize if > 10MB
                    const compressedBlob = await compressVideo(videoFile);
                    fileToUpload = new File([compressedBlob], videoFile.name, {
                        type: compressedBlob.type,
                        lastModified: Date.now()
                    });
                }
            } catch (compressionError) {
                console.warn('Video compression failed, falling back to original file:', compressionError);
                // Fallback to original file if compression fails
            }

            setIsOptimizing(false); // Optimization done, starting upload
            showToast("Upload started...", "success");

            // Simulate progress (this is just visual feedback for the upload phase)
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const extension = videoFile.name.split('.').pop() || 'mp4';
            const path = `${hostId}/${Date.now()}.${extension}`;
            const url = await uploadVideoToSupabase(fileToUpload, 'verification-videos', path);

            clearInterval(progressInterval);
            setUploadProgress(100);
            setVideoUrl(url);
            setErrors({}); // Clear any previous errors
            showToast("Video uploaded successfully!", "success");

            setTimeout(() => {
                setIsUploading(false);
            }, 500);
        } catch (error: any) {
            console.error('Upload failed:', error);
            // Show detailed error if available
            const errorMessage = error.message || 'Failed to upload video. Please try again.';
            setErrors({ video: errorMessage });
            showToast('Failed to upload video', 'error');
            setIsUploading(false);
            setIsOptimizing(false);
            setUploadProgress(0);
        }
    };

    const triggerConfetti = () => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    };

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};

        // Video is now optional
        if (!warrantyAccepted) {
            newErrors.warranty = 'You must accept the ownership warranty';
            showToast('Please accept the ownership warranty', 'error');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const ipAddress = await captureIpAddress();
            const timestamp = getCurrentTimestamp();

            const legalData: LegalData = {
                ownershipWarranty: {
                    accepted: true,
                    timestamp,
                    ipAddress,
                },
            };

            // Add video tour if uploaded
            if (videoUrl) {
                legalData.videoHomeTour = {
                    url: videoUrl,
                    uploadedAt: timestamp,
                };
            }

            // Trigger confetti celebration
            triggerConfetti();

            // Wait a moment for confetti to start, then complete
            setTimeout(async () => {
                try {
                    await onComplete(legalData);
                    setIsSubmitting(false);
                } catch (error) {
                    console.error('Completion failed:', error);
                    setIsSubmitting(false);
                }
            }, 500);
        } catch (error) {
            console.error('Submission failed:', error);
            setErrors({ submit: 'Failed to submit. Please try again.' });
            showToast('Submission failed', 'error');
            setIsSubmitting(false);
        }
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
                    <div className="text-sm font-bold text-gray-400">STEP 5 OF 5</div>
                </div>
                <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">Final Step</h2>
                    <p className="text-gray-500 text-sm mt-1">Accept terms & optionally add a home tour</p>
                </div>
            </div>

            <div className="px-5 py-6 space-y-6 max-w-2xl mx-auto">
                {/* Video Upload */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Video size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Video Home Tour</h3>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">Optional</span>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 mb-5">
                        <p className="text-sm text-indigo-900 leading-relaxed">
                            <strong>📹 Required before going live:</strong> A quick walkthrough video (30-60 seconds) helps guests visualize your space.
                            Show key areas like the living room, bedroom, kitchen, and any special features. <strong>You can skip this now and add it later from your dashboard before publishing.</strong>
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {!videoFile ? (
                            <motion.label
                                key="upload"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="block cursor-pointer group"
                            >
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoSelect}
                                    className="hidden"
                                />
                                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group-hover:scale-[1.01]">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-100 transition-colors">
                                        <Upload className="text-gray-400 group-hover:text-indigo-600 transition-colors" size={28} />
                                    </div>
                                    <p className="text-base font-bold text-gray-900 mb-1">
                                        Click to upload video
                                    </p>
                                    <p className="text-xs text-gray-500">MP4, MOV, or WebM (max 100MB)</p>
                                </div>
                            </motion.label>
                        ) : !videoUrl ? (
                            <motion.div
                                key="selected"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                        <FileVideo className="text-indigo-600" size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {videoFile.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setVideoFile(null)}
                                        className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-gray-100"
                                    >
                                        <span className="text-xl leading-none mb-0.5">&times;</span>
                                    </button>
                                </div>

                                {isUploading ? (
                                    <div className="space-y-4 py-2">
                                        {isOptimizing ? (
                                            <div className="flex flex-col items-center justify-center space-y-3 py-2 text-center">
                                                <InfinityCheckLoader isLoading={true} size="w-8 h-8" color="text-indigo-600" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Optimizing Video...</p>
                                                    <p className="text-xs text-gray-500">Compressing for fast playback. This may take a minute.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider px-1">
                                                    <span className="text-gray-500">Uploading...</span>
                                                    <span className="text-indigo-600">{uploadProgress}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${uploadProgress}%` }}
                                                        className="h-full bg-indigo-600 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleVideoUpload}
                                        className="w-full py-3.5 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Upload size={18} />
                                        Start Upload
                                    </button>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="uploaded"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-4"
                            >
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-green-600 shrink-0">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-green-900">Video uploaded!</p>
                                    <p className="text-xs text-green-700 mt-0.5">Ready for submission</p>
                                </div>
                                <button
                                    onClick={() => window.open(videoUrl, '_blank')}
                                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm hover:scale-105 transition-transform"
                                >
                                    <Play size={18} fill="currentColor" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {errors.video && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
                        >
                            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-red-600 text-sm font-medium">{errors.video}</p>
                        </motion.div>
                    )}
                </motion.div>

                {/* Legal Warranty - Only show if not already accepted */}
                {!initialLegalData?.ownershipWarranty?.accepted && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                                <Shield size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Ownership Warranty</h3>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-5 mb-5 max-h-48 overflow-y-auto text-xs text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100 font-medium">
                            {LEGAL_TEXT}
                        </div>

                        <label className="flex items-start gap-4 cursor-pointer group p-2 -ml-2 hover:bg-gray-50 rounded-xl transition-colors">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={warrantyAccepted}
                                    onChange={(e) => setWarrantyAccepted(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-500"
                                />
                                <CheckCircle2 className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" size={14} />
                            </div>
                            <span className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                                <strong>I accept the ownership warranty</strong> and confirm that all information provided is accurate.
                            </span>
                        </label>

                        {errors.warranty && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
                            >
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-red-600 text-sm font-medium">{errors.warranty}</p>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={(!videoUrl && draftSaved) ? onNavigateToListings : handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all ${videoUrl
                        ? 'bg-green-600 text-white shadow-green-600/20 hover:bg-green-700'
                        : 'bg-indigo-500 text-white '
                        }`}
                >
                    {isSubmitting ? (
                        <InfinityCheckLoader isLoading={true} size="w-6 h-6" color="white" />
                    ) : videoUrl ? (
                        <>
                            <CheckCircle2 size={20} />
                            Confirm Listing
                        </>
                    ) : draftSaved ? (
                        <>
                            <CheckCircle2 size={20} />
                            Go to Manage Listings
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={20} />
                            Save as Draft
                        </>
                    )}
                </motion.button>

                {/* Disclaimer when no video */}
                {!videoUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
                    >
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-amber-900 text-sm leading-relaxed">
                            <strong>⚠️ You can go live now with a home tour video.</strong> Upload it above to confirm your listing and make it visible to guests.
                        </p>
                    </motion.div>
                )}

                {errors.submit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
                    >
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-red-600 text-sm font-medium">{errors.submit}</p>
                    </motion.div>
                )}
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
