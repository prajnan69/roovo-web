"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronLeft, ShieldCheck, AlertCircle, QrCode, Smartphone } from "lucide-react";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";
import { usePreloadedData } from "@/context/PreloadContext";
import { updatePayoutMethod, initiateRPD, getRPDStatus } from "@/services/api";
import { useNavigation } from "@/hooks/useNavigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
// We need to import or implement a QR renderer.
// Actually, I don't know if qrcode.react is installed. Cashfree returns a base64 string "qr_code" which is an IMAGE.
// Documentation says: "It displays the generated QR code ... in base64-encoded format."
// So we can just use <img src={`data:image/png;base64,${data.qr_code}`} /> logic.

// Only defining key paths to keep file size reasonable
const INFINITY_PATH = "M900.450378,327.092316  C889.395569,321.869659 877.787842,317.556183 867.399780,311.237366  C844.969238,297.593292 827.497864,278.320740 810.860901,258.305328  C809.552307,256.730988 808.058716,255.310471 806.395508,253.547607  C792.509766,271.671021 779.028564,289.147644 765.803650,306.816193  C764.990356,307.902740 765.554077,311.014099 766.579102,312.315399  C771.817749,318.966095 777.143005,325.591156 782.943909,331.748596  C800.794128,350.696259 820.421021,367.405945 844.127319,378.777466  C866.190735,389.360992 889.511475,395.217896 913.742432,398.227600  C946.116699,402.248810 978.093628,401.447266 1008.420044,388.474976  C1071.170410,361.633179 1109.586548,316.241608 1113.723755,245.921585  C1115.653931,213.117035 1111.562378,181.109863 1094.652954,152.440781  C1064.626831,101.532661 1019.274719,73.027054 960.757629,66.425209  C938.091431,63.868038 915.240967,65.031616 892.667114,69.902550  C867.612793,75.308731 843.978943,84.016258 821.901306,97.079819  C793.654175,113.793930 771.019409,136.784393 750.735168,162.009277  C721.057983,198.914810 692.575562,236.778824 663.083313,273.835968  C639.559143,303.394348 611.320435,326.183899 572.721619,333.170746  C540.025208,339.089233 511.129486,331.830933 486.354156,309.381012  C455.805695,281.699829 450.095093,235.879929 462.509552,199.105377  C472.537933,169.398987 493.926636,150.158905 522.942871,140.648193  C553.713013,130.562622 583.995667,134.814575 612.634827,149.973679  C635.524292,162.089462 653.441406,179.910049 669.563782,199.774490  C672.751404,203.701920 675.977234,207.598221 679.765198,212.215546  C693.788330,194.023849 707.288757,176.585266 720.615540,159.015015  C721.331482,158.071167 721.179382,155.580872 720.421143,154.562775  C717.347351,150.435562 713.869019,146.610535 710.557068,142.659653  C676.297119,101.790367 634.250183,75.018456 579.979309,70.024750  C544.252869,66.737396 509.634705,69.674515 476.773468,85.632614  C446.572052,100.299065 422.130188,121.315140 404.059662,149.599930  C391.478271,169.292831 385.011230,191.106903 382.350281,214.191162  C378.613007,246.612686 381.464691,278.565399 395.884369,307.817932  C422.307098,361.420410 466.884156,391.645386 525.567078,400.233795  C541.702515,402.595276 558.652954,402.123932 574.921387,400.261566  C607.125183,396.574799 637.474976,386.239594 665.312988,369.265961  C695.612976,350.791199 719.528137,325.429657 741.245422,297.862610  C767.652405,264.342590 793.579895,230.445190 819.948303,196.894562  C843.181091,167.333420 870.976990,144.114731 908.693542,135.393600  C931.375427,130.148911 954.309143,129.660477 975.844910,138.733536  C1010.609985,153.380157 1032.893921,178.924423 1037.714478,217.545074  C1040.247192,237.836761 1039.302002,257.940369 1030.750122,276.801270  C1018.634033,303.523163 998.294495,321.190552 969.943665,329.428802  C946.785522,336.158142 923.915466,334.596283 900.450378,327.092316";
const CHECKMARK_PATH = "M580 230 L730 380 L1030 80";

const PayoutMethods = () => {
    const { navigate, back } = useNavigation();
    const { profileData } = usePreloadedData();

    const [holderName, setHolderName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [waitingForPayment, setWaitingForPayment] = useState(false);
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<{ qr_code_base64: string, upi_link: string } | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'error' | 'success_transition'>('idle');
    const [verifiedDetails, setVerifiedDetails] = useState<{ name: string; account_number: string; ifsc_code: string; bank_name: string } | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [countdown, setCountdown] = useState(5);

    // Initial Setup
    const handleInitiate = async () => {
        setIsLoading(true);
        setVerificationStatus('verifying'); // Shows "Generating Payment Link..."
        setErrorMessage("");

        try {
            // Step 1: Create RPD Request
            const data = await initiateRPD(holderName, profileData?.id || "unknown_user");
            if (data.success) {
                setVerificationId(data.verification_id);
                setPaymentData({ qr_code_base64: data.qr_code, upi_link: data.upi_link });
                setWaitingForPayment(true);
                setVerificationStatus('idle'); // We are idle on payment screen, waiting for scan
            } else {
                setVerificationStatus('error');
                setErrorMessage("Failed to initiate verification");
                triggerErrorHaptic();
            }
        } catch (error: any) {
            console.error("RPD Init error:", error);
            setVerificationStatus('error');
            setErrorMessage(error.message || "Failed to initiate verification");
            triggerErrorHaptic();
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (id: string) => {
        try {
            const statusData = await getRPDStatus(id);
            if (statusData.success && statusData.status === 'SUCCESS') {
                setVerifiedDetails({
                    name: statusData.holder_name,
                    account_number: statusData.account_number,
                    ifsc_code: statusData.ifsc,
                    bank_name: statusData.bank_name || "Unknown Bank" // Cashfree might not always return bank name directly
                });
                setVerificationStatus('verified');
                triggerHaptic();
                return true; // Indicate success
            } else if (statusData.status === 'FAILED' || statusData.status === 'EXPIRED') {
                setVerificationStatus('error');
                setErrorMessage(statusData.message || "Bank account verification failed or expired.");
                triggerErrorHaptic();
                return true; // Indicate failure, stop polling
            }
            return false; // Continue polling
        } catch (error: any) {
            console.error("RPD Status error:", error);
            setVerificationStatus('error');
            setErrorMessage(error.message || "Failed to check verification status.");
            triggerErrorHaptic();
            return true; // Stop polling on API error
        }
    };

    const handleSave = async (details = verifiedDetails) => {
        if (!details || !profileData?.id) return;

        setIsLoading(true);
        try {
            await updatePayoutMethod(profileData.id, 'bank_transfer', {
                bank_name: details.bank_name,
                account_number: details.account_number,
                ifsc_code: details.ifsc_code,
                holder_name: details.name,
                verified: true
            });

            triggerHaptic();
            navigate('/hosting'); // Go back to dashboard on success
        } catch (error) {
            console.error("Failed to save payout method:", error);
            alert("Failed to save payout details. Please try again.");
            triggerErrorHaptic();
        } finally {
            setIsLoading(false);
        }
    };

    // Polling effect for RPD status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (waitingForPayment && verificationId) {
            interval = setInterval(async () => {
                const stopPolling = await handleVerify(verificationId);
                if (stopPolling) {
                    clearInterval(interval);
                    setWaitingForPayment(false); // Stop showing QR code
                }
            }, 3000); // Poll every 3 seconds
        }

        return () => clearInterval(interval);
    }, [waitingForPayment, verificationId]);

    // Auto-save effect after verification
    const confettiFired = useRef(false);
    useEffect(() => {
        if (verificationStatus === 'verified' && verifiedDetails) {
            // 1. Success Animation Triggered by state 'verified'

            // 2. Confetti
            if (!confettiFired.current) {
                confettiFired.current = true;
                const count = 200;
                const defaults = { origin: { y: 0.7 }, zIndex: 100, ticks: 200, gravity: 0.8 };
                const fire = (particleRatio: number, opts: any) => {
                    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
                };
                setTimeout(() => {
                    fire(0.25, { spread: 26, startVelocity: 55, colors: ['#10b981', '#34d399'] });
                    fire(0.2, { spread: 60, colors: ['#fcd34d', '#fbbf24'] });
                }, 400);

                // Haptic
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([10, 30, 10, 30]);
                }
            }

            // 3. Countdown & Auto-Save
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleSave();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [verificationStatus, verifiedDetails]);

    return (
        <div className="min-h-screen bg-white relative overflow-hidden">
            {/* --- FULL SCREEN OVERLAYS --- */}
            <AnimatePresence>
                {/* 1. Verifying Overlay */}
                {verificationStatus === 'verifying' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-indigo-50/95 backdrop-blur-md"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-200/40 blur-[100px] rounded-full pointer-events-none" />
                        <div className="w-32 h-32 relative z-10 mb-8">
                            <svg viewBox="350 50 800 380" className="w-full h-full text-indigo-600 drop-shadow-[0_4px_10px_rgba(79,70,229,0.3)]">
                                <motion.path
                                    d={INFINITY_PATH}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0.5], pathOffset: [0, 0, 1] }}
                                    transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "loop" }}
                                />
                            </svg>
                        </div>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-lg font-bold text-indigo-900 z-10"
                        >
                            Verifying Bank Details...
                        </motion.p>
                        <p className="text-indigo-600/70 text-sm mt-2 z-10">This takes about 5-10 seconds</p>
                    </motion.div>
                )}

                {/* 2. Success Overlay */}
                {verificationStatus === 'verified' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-50/95 backdrop-blur-md"
                    >
                        <svg width="0" height="0" className="absolute">
                            <defs>
                                <filter id="light-glow-payout" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                                    <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.8 0 0 0 0 0.5 0 0 0 0.5 0" result="glow" />
                                    <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                        </svg>

                        <div className="w-40 h-40 mb-6 relative flex items-center justify-center text-emerald-500">
                            <motion.svg viewBox="350 50 800 380" className="w-full h-full" style={{ filter: "url(#light-glow-payout)" }}>
                                <motion.path
                                    d={CHECKMARK_PATH}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1, scale: [1, 1.1, 1] }}
                                    transition={{
                                        pathLength: { duration: 0.6, type: "spring", stiffness: 120, damping: 14 },
                                        scale: { duration: 0.4, delay: 0.4 },
                                        opacity: { duration: 0.2 }
                                    }}
                                />
                            </motion.svg>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-center px-8"
                        >
                            <h2 className="text-3xl font-black text-emerald-950 mb-2">Verified!</h2>
                            <p className="text-emerald-700 font-medium mb-1">
                                {verifiedDetails?.name}
                            </p>
                            <p className="text-emerald-600/60 text-sm">
                                Redirecting in {countdown}s...
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                <button
                    onClick={() => back()}
                    className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-900" />
                </button>
                <div className="text-xl font-bold text-gray-900">Add Bank Details</div>
            </div>

            <div className="p-6 max-w-lg mx-auto pb-32">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-8 flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-900/80 leading-relaxed">
                        Your bank details are secure. We verify your account with a small deposit to ensuring you receive payments without issues.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Error Banner Only (Success/Verifying handled by overlays) */}
                    {verificationStatus === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3"
                        >
                            <AlertCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-red-900">Verification Failed</p>
                                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                            </div>
                        </motion.div>
                    )}

                    {/* PAYMENT UI - QR CODE */}
                    {waitingForPayment && paymentData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border-2 border-indigo-100 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl shadow-indigo-100/50"
                        >
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Scan to Verify</h3>
                            <p className="text-gray-500 text-sm mb-6">Pay ₹1 to instantly verify your bank account. The amount will be refunded automatically.</p>

                            <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-6 relative group">
                                <div className="absolute inset-0 bg-indigo-500/5 blur-xl group-hover:blur-2xl transition-all" />
                                {paymentData.qr_code_base64 ? (
                                    <img
                                        src={`data:image/png;base64,${paymentData.qr_code_base64}`}
                                        alt="QR Code"
                                        className="w-48 h-48 object-contain relative z-10"
                                    />
                                ) : (
                                    <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                        <QrCode size={40} />
                                    </div>
                                )}
                            </div>

                            <a
                                href={paymentData.upi_link}
                                className="inline-flex items-center gap-2 text-indigo-600 font-semibold bg-indigo-50 px-5 py-2.5 rounded-full hover:bg-indigo-100 transition-colors mb-4"
                            >
                                <Smartphone size={18} />
                                <span>Pay via UPI App</span>
                            </a>

                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                Waiting for payment...
                            </div>
                        </motion.div>
                    )}

                    {/* INPUT FORM (Hidden when waiting for payment) */}
                    {!waitingForPayment && (
                        <form onSubmit={(e) => { e.preventDefault(); handleInitiate(); }} className="space-y-5">
                            <AnimatePresence mode="popLayout">
                                <motion.div layout className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">Account Holder Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={holderName}
                                            onChange={(e) => setHolderName(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-gray-400 font-medium"
                                            placeholder="e.g. John Doe"
                                            disabled={verificationStatus === 'verified'}
                                        />
                                        <p className="text-xs text-gray-400 mt-2 px-1">
                                            Enter the name exactly as it appears on your bank account.
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </form>
                    )}
                </div>
            </div>

            {/* Persistent Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-8 z-20">
                <div className="max-w-lg mx-auto">
                    {/* Simplified Button since full screen overlay handles states */}
                    {/* Button Visibility Logic */}
                    {!waitingForPayment && verificationStatus !== 'verified' && (
                        <Button
                            onClick={handleInitiate}
                            disabled={isLoading || !holderName}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? "Generating Link..." : "Continue to Pay ₹1"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayoutMethods;
