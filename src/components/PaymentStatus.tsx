import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";
import { useNavigation } from "@/hooks/useNavigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";

// Path from RoovoLoader.tsx
const INFINITY_PATH = "M900.450378,327.092316  C889.395569,321.869659 877.787842,317.556183 867.399780,311.237366  C844.969238,297.593292 827.497864,278.320740 810.860901,258.305328  C809.552307,256.730988 808.058716,255.310471 806.395508,253.547607  C792.509766,271.671021 779.028564,289.147644 765.803650,306.816193  C764.990356,307.902740 765.554077,311.014099 766.579102,312.315399  C771.817749,318.966095 777.143005,325.591156 782.943909,331.748596  C800.794128,350.696259 820.421021,367.405945 844.127319,378.777466  C866.190735,389.360992 889.511475,395.217896 913.742432,398.227600  C946.116699,402.248810 978.093628,401.447266 1008.420044,388.474976  C1071.170410,361.633179 1109.586548,316.241608 1113.723755,245.921585  C1115.653931,213.117035 1111.562378,181.109863 1094.652954,152.440781  C1064.626831,101.532661 1019.274719,73.027054 960.757629,66.425209  C938.091431,63.868038 915.240967,65.031616 892.667114,69.902550  C867.612793,75.308731 843.978943,84.016258 821.901306,97.079819  C793.654175,113.793930 771.019409,136.784393 750.735168,162.009277  C721.057983,198.914810 692.575562,236.778824 663.083313,273.835968  C639.559143,303.394348 611.320435,326.183899 572.721619,333.170746  C540.025208,339.089233 511.129486,331.830933 486.354156,309.381012  C455.805695,281.699829 450.095093,235.879929 462.509552,199.105377  C472.537933,169.398987 493.926636,150.158905 522.942871,140.648193  C553.713013,130.562622 583.995667,134.814575 612.634827,149.973679  C635.524292,162.089462 653.441406,179.910049 669.563782,199.774490  C672.751404,203.701920 675.977234,207.598221 679.765198,212.215546  C693.788330,194.023849 707.288757,176.585266 720.615540,159.015015  C721.331482,158.071167 721.179382,155.580872 720.421143,154.562775  C717.347351,150.435562 713.869019,146.610535 710.557068,142.659653  C676.297119,101.790367 634.250183,75.018456 579.979309,70.024750  C544.252869,66.737396 509.634705,69.674515 476.773468,85.632614  C446.572052,100.299065 422.130188,121.315140 404.059662,149.599930  C391.478271,169.292831 385.011230,191.106903 382.350281,214.191162  C378.613007,246.612686 381.464691,278.565399 395.884369,307.817932  C422.307098,361.420410 466.884156,391.645386 525.567078,400.233795  C541.702515,402.595276 558.652954,402.123932 574.921387,400.261566  C607.125183,396.574799 637.474976,386.239594 665.312988,369.265961  C695.612976,350.791199 719.528137,325.429657 741.245422,297.862610  C767.652405,264.342590 793.579895,230.445190 819.948303,196.894562  C843.181091,167.333420 870.976990,144.114731 908.693542,135.393600  C931.375427,130.148911 954.309143,129.660477 975.844910,138.733536  C1010.609985,153.380157 1032.893921,178.924423 1037.714478,217.545074  C1040.247192,237.836761 1039.302002,257.940369 1030.750122,276.801270  C1018.634033,303.523163 998.294495,321.190552 969.943665,329.428802  C946.785522,336.158142 923.915466,334.596283 900.450378,327.092316";

// Streamlined Checkmark Path
const CHECKMARK_PATH = "M580 230 L730 380 L1030 80";

const PaymentStatus = () => {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [listingId, setListingId] = useState<string | null>(null);
  const { navigate } = useNavigation();

  useEffect(() => {
    const verify = async () => {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("order_id");
      const subscriptionId = params.get("subscription_id");

      if (subscriptionId) {
        // Handle Subscription Verification
        try {
          const res = await fetch(`${API_BASE_URL}/api/subscriptions/check-status/${subscriptionId}`);
          if (!res.ok) throw new Error("Verification failed");
          const data = await res.json();

          if (data.status === 'SUCCESS' || data.status === 'ACTIVE' || data.status === 'COMPLETED') {
            if (data.listingId) setListingId(data.listingId);
            setStatus("success");
          } else {
            setStatus("failed");
          }
        } catch (e) {
          console.error(e);
          setStatus("failed");
        }
        return;
      }

      if (!orderId) {
        // If neither, fail or maybe it's just a direct visit? 
        // Original logic set failure if no orderId.
        setStatus("failed");
        return;
      }

      try {
        // Verify payment via Paytm
        const res = await fetch(`${API_BASE_URL}/api/paytm/orders/${orderId}/status`);
        if (!res.ok) throw new Error("Verification failed");
        const data = await res.json();

        if (data.status === "SUCCESS") {
          // --- Split Payment Fallback ---
          // Webhooks only fire to production. When returning from Cashfree,
          // we directly mark the split as paid here as a reliable fallback.
          try {
            const splitRes = await fetch(`${API_BASE_URL}/api/payment-splits/mark-paid/${orderId}`, {
              method: 'POST',
            });
            if (splitRes.ok) {
              const splitData = await splitRes.json();
              console.log('Split marked as paid:', splitData);
              // If it was a split payment, navigate to home immediately
              setStatus("success");
              return;
            }
            // 404 means it wasn't a split order — continue to normal booking flow
          } catch (splitErr) {
            console.warn('Split mark-paid check failed (may not be a split order):', splitErr);
          }
          // --- End Split Payment Fallback ---

          // Retrieve pending booking data
          const bookingDataStr = localStorage.getItem(`pending_booking_${orderId}`);
          if (bookingDataStr) {
            const bookingData = JSON.parse(bookingDataStr);

            // Create Booking unconditionally (backend handles duplicate db constraint)
            const createRes = await fetch(`${API_BASE_URL}/api/bookings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...bookingData, payment_order_id: orderId }),
            });

            if (createRes.ok) {
              setStatus("success");
              localStorage.removeItem(`pending_booking_${orderId}`);
            } else {
              console.error("Booking creation failed");
              setStatus("failed"); // Payment success but booking failed
            }
          } else {
            // Maybe booking already created or lost data?
            setStatus("success"); // Assume success if payment verified
          }
        } else {
          setStatus("failed");
        }
      } catch (e) {
        console.error(e);
        setStatus("failed");
      }
    };

    verify();
  }, []);

  useEffect(() => {
    if (status === "success") {
      const triggerConfetti = () => {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 100,
          ticks: 200,
          gravity: 0.8,
          scalar: 1, // Larger pieces
        };

        function fire(particleRatio: number, opts: any) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
            colors: ['#10b981', '#34d399', '#fcd34d', '#fbbf24', '#ffffff'] // Emerald, Green, Gold, Amber, White
          });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      };

      // Trigger after logo animation starts (sync with checkmark growth)
      const timer = setTimeout(triggerConfetti, 400);

      // Auto-navigate to home or listing after 3.2 seconds
      const navTimer = setTimeout(() => {
        if (listingId) {
          navigate(`/listing/${listingId}`);
        } else {
          localStorage.setItem('show_booking_banner', 'true');
          navigate('/');
        }
      }, 3200);

      // Haptic
      triggerHaptic();

      return () => {
        clearTimeout(timer);
        clearTimeout(navTimer);
      };
    } else if (status === "failed") {
      triggerErrorHaptic();
    }
  }, [status, navigate, listingId]);


  // Loading State with Premium Light Gradient
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-200/40 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-32 h-32 relative z-10">
          <svg
            viewBox="350 50 800 380"
            className="w-full h-full text-indigo-600 drop-shadow-[0_4px_10px_rgba(79,70,229,0.3)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d={INFINITY_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1],
                opacity: [0, 1, 0.5],
                pathOffset: [0, 0, 1]
              }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
          </svg>
        </div>
      </div>
    );
  }

  // Success State
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-emerald-200">
        {/* Filters for Glow Effect - Adjusted for Light Mode */}
        <svg width="0" height="0">
          <defs>
            <filter id="light-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              {/* Subtle emerald tint */}
              <feColorMatrix in="blur" type="matrix" values="
                                0 0 0 0 0.2
                                0 0 0 0 0.8
                                0 0 0 0 0.5
                                0 0 0 0.5 0" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Animated Background Ambience */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/50 blur-[120px] rounded-full pointer-events-none"
        />

        {/* Card Container (Glassmorphism Light) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="relative z-10 w-[90%] max-w-sm p-10 flex flex-col items-center justify-center 
                               bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden"
        >
          {/* Top Shine Effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

          {/* Checkmark Animation */}
          <div className="w-52 h-44 mb-8 -mt-4 relative flex items-center justify-center text-emerald-500">
            <motion.svg
              viewBox="350 50 800 380"
              className="w-full h-full"
              style={{ filter: "url(#light-glow)" }} // Apply Glow Filter
            >
              {/* Ghost Path (Infinity) Fading Out */}
              <motion.path
                d={INFINITY_PATH}
                fill="none"
                stroke="#e2e8f0" // slate-200
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0, pathLength: 0 }}
                transition={{ duration: 0.5, ease: "circIn" }}
              />

              {/* Morphing Path Checkmark */}
              <motion.path
                d={CHECKMARK_PATH}
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                  scale: [1, 1.1, 1], // Subtle pop
                }}
                transition={{
                  pathLength: { duration: 0.6, type: "spring", stiffness: 120, damping: 14, delay: 0.4 },
                  scale: { duration: 0.4, delay: 0.8 },
                  opacity: { duration: 0.2, delay: 0.4 }
                }}
              />
            </motion.svg>
          </div>

          {/* Text Staggered Entry */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 150 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Confirmed</h2>
            <p className="text-slate-500 text-sm font-medium tracking-wide leading-relaxed">
              Your transaction was successful.<br />You're all set to go.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Failed State (Light Mode)
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 mb-6 text-rose-500 p-6 bg-rose-50 rounded-full ring-1 ring-rose-100 shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
      </motion.div>
      <h2 className="text-2xl font-bold mb-2 tracking-tight">Payment Failed</h2>
      <p className="text-slate-500 mb-8 font-medium">We couldn't process your payment.</p>
      <button onClick={() => window.history.back()} className="px-8 py-3 bg-white text-slate-900 border border-slate-200 font-bold rounded-full shadow-sm hover:bg-slate-50 transition-colors">
        Try Again
      </button>
    </div>
  );
};

export default PaymentStatus;
