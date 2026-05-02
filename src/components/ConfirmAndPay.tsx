"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { API_BASE_URL } from "../services/api";
import SlideToReserve from "./SlideToReserve";
import { load } from '@cashfreepayments/cashfree-js';
import SplitPaymentDrawer from "./SplitPaymentDrawer";
import { Users, ShieldAlert } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import confetti from "canvas-confetti";
import { useNavigation } from "@/hooks/useNavigation";
import { resolveImageUrl } from "@/utils/imageUtils";

const INFINITY_PATH = "M900.450378,327.092316  C889.395569,321.869659 877.787842,317.556183 867.399780,311.237366  C844.969238,297.593292 827.497864,278.320740 810.860901,258.305328  C809.552307,256.730988 808.058716,255.310471 806.395508,253.547607  C792.509766,271.671021 779.028564,289.147644 765.803650,306.816193  C764.990356,307.902740 765.554077,311.014099 766.579102,312.315399  C771.817749,318.966095 777.143005,325.591156 782.943909,331.748596  C800.794128,350.696259 820.421021,367.405945 844.127319,378.777466  C866.190735,389.360992 889.511475,395.217896 913.742432,398.227600  C946.116699,402.248810 978.093628,401.447266 1008.420044,388.474976  C1071.170410,361.633179 1109.586548,316.241608 1113.723755,245.921585  C1115.653931,213.117035 1111.562378,181.109863 1094.652954,152.440781  C1064.626831,101.532661 1019.274719,73.027054 960.757629,66.425209  C938.091431,63.868038 915.240967,65.031616 892.667114,69.902550  C867.612793,75.308731 843.978943,84.016258 821.901306,97.079819  C793.654175,113.793930 771.019409,136.784393 750.735168,162.009277  C721.057983,198.914810 692.575562,236.778824 663.083313,273.835968  C639.559143,303.394348 611.320435,326.183899 572.721619,333.170746  C540.025208,339.089233 511.129486,331.830933 486.354156,309.381012  C455.805695,281.699829 450.095093,235.879929 462.509552,199.105377  C472.537933,169.398987 493.926636,150.158905 522.942871,140.648193  C553.713013,130.562622 583.995667,134.814575 612.634827,149.973679  C635.524292,162.089462 653.441406,179.910049 669.563782,199.774490  C672.751404,203.701920 675.977234,207.598221 679.765198,212.215546  C693.788330,194.023849 707.288757,176.585266 720.615540,159.015015  C721.331482,158.071167 721.179382,155.580872 720.421143,154.562775  C717.347351,150.435562 713.869019,146.610535 710.557068,142.659653  C676.297119,101.790367 634.250183,75.018456 579.979309,70.024750  C544.252869,66.737396 509.634705,69.674515 476.773468,85.632614  C446.572052,100.299065 422.130188,121.315140 404.059662,149.599930  C391.478271,169.292831 385.011230,191.106903 382.350281,214.191162  C378.613007,246.612686 381.464691,278.565399 395.884369,307.817932  C422.307098,361.420410 466.884156,391.645386 525.567078,400.233795  C541.702515,402.595276 558.652954,402.123932 574.921387,400.261566  C607.125183,396.574799 637.474976,386.239594 665.312988,369.265961  C695.612976,350.791199 719.528137,325.429657 741.245422,297.862610  C767.652405,264.342590 793.579895,230.445190 819.948303,196.894562  C843.181091,167.333420 870.976990,144.114731 908.693542,135.393600  C931.375427,130.148911 954.309143,129.660477 975.844910,138.733536  C1010.609985,153.380157 1032.893921,178.924423 1037.714478,217.545074  C1040.247192,237.836761 1039.302002,257.940369 1030.750122,276.801270  C1018.634033,303.523163 998.294495,321.190552 969.943665,329.428802  C946.785522,336.158142 923.915466,334.596283 900.450378,327.092316";
const CHECKMARK_PATH = "M580 230 L730 380 L1030 80";

interface ConfirmAndPayProps {
  listing: {
    id: string;
    title: string;
    primary_image_url: string;
    overall_rating: number;
    total_reviews: number;
    cancellation_policy: string;
  };
  bookingDetails: {
    startDate: string;
    endDate: string;
    guests: number;
    nights: number;
  };
  priceDetails: {
    pricePerNight: number;
    totalPrice: number;
    taxes: number;
  };
  onBack: () => void;
  host_id: string;
  auto_bookable?: boolean;
  isFeeWaived?: boolean;
  guestDetails: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function ConfirmAndPay({
  listing,
  bookingDetails,
  priceDetails,
  onBack,
  host_id,
  auto_bookable,
  isFeeWaived,
  guestDetails,
}: ConfirmAndPayProps) {
  const [bookingStatus, setBookingStatus] = useState<
    "idle" | "loading" | "confirmed" | "pending"
  >("idle");
  const [cashfree, setCashfree] = useState<any>(null);
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [isSplitDrawerOpen, setIsSplitDrawerOpen] = useState(false);
  const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
  const [splitSuccessData, setSplitSuccessData] = useState<any | null>(null);
  const [isPayingPrimary, setIsPayingPrimary] = useState(false);
  const [manualPaymentsEnabled, setManualPaymentsEnabled] = useState(true);
  const { navigate } = useNavigation();

  useEffect(() => {
    if (bookingStatus === "confirmed") {
      const triggerConfetti = () => {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 100,
          ticks: 200,
          gravity: 0.8,
          scalar: 1,
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

      setTimeout(triggerConfetti, 400);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([10, 30, 10, 30]);
      }
    }
  }, [bookingStatus]);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        const cf = await load({
          mode: import.meta.env.VITE_CASHFREE_MODE === "production" ? "production" : "sandbox"
        });
        setCashfree(cf);
      } catch (err) {
        console.error("Cashfree SDK failed to load", err);
      }
    };
    initializeSDK();

    // Fetch manual payments setting
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
         if (data && typeof data.manual_payments_enabled === 'boolean') {
             setManualPaymentsEnabled(data.manual_payments_enabled);
         }
      })
      .catch(err => console.error("Failed to fetch settings", err));
  }, []);

  const serviceFeePercent = isFeeWaived ? 0 : 0.03;
  const basePricePerNight = priceDetails.pricePerNight;
  const serviceFeePerNight = basePricePerNight * serviceFeePercent;

  const nights = bookingDetails.nights;
  const currentRoovoBaseTotal = basePricePerNight * nights;
  const currentRoovoServiceFeeTotal = serviceFeePerNight * nights;
  const currentRoovoTotal = isFeeWaived ? currentRoovoBaseTotal : (currentRoovoBaseTotal + currentRoovoServiceFeeTotal);

  const roomGstRate = basePricePerNight > 7500 ? 0.18 : 0.12;
  const roomGstTotal = currentRoovoBaseTotal * roomGstRate;
  const serviceFeeGstTotal = currentRoovoServiceFeeTotal * 0.18;

  const totalTax = roomGstTotal + serviceFeeGstTotal;
  const grandTotal = currentRoovoTotal + totalTax;

  const handleBooking = async (): Promise<boolean> => {
    setBookingStatus("loading");

    try {
      if (manualPaymentsEnabled) {
        // Bypass CashFree and create booking directly
        await createBooking("at_property");
        return true;
      }

      const orderAmount = parseFloat(grandTotal.toFixed(2));

      // CASE: Split Payment
      if (isSplitEnabled && splitParticipants.length > 0) {
        // 1. Initiate Split on Backend
        const splitRes = await fetch(`${API_BASE_URL}/api/payment-splits/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingData: {
              listing_id: listing.id,
              guest_id: guestDetails.id,
              host_id,
              start_date: bookingDetails.startDate,
              end_date: bookingDetails.endDate,
              total_price: orderAmount,
              host_payout: parseFloat(currentRoovoBaseTotal.toFixed(2)),
              taxes: parseFloat(totalTax.toFixed(2)),
              our_fees: parseFloat(currentRoovoServiceFeeTotal.toFixed(2)),
              host_fees: 0,
              auto_bookable,
            },
            participants: [guestDetails.phone, ...splitParticipants],
            primaryUserId: guestDetails.id,
            totalAmount: orderAmount
          })
        });

        if (!splitRes.ok) throw new Error("Failed to initiate split");
        const splitData = await splitRes.json();

        // Instead of redirecting immediately, show the links in the drawer
        setSplitSuccessData(splitData);
        setIsSplitDrawerOpen(true);
        setBookingStatus("idle");
        return true;
      }

      // CASE: Normal Full Payment
      const customerPhone = guestDetails.phone || "9999999999";
      const customerName = guestDetails.name || "Guest";

      const orderRes = await fetch(`${API_BASE_URL}/api/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_amount: orderAmount,
          customer_details: {
            customer_id: guestDetails.id,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: "guest@roovo.in"
          },
          order_meta: {
            return_url: `${window.location.origin}/payment/status?order_id={order_id}`
          }
        })
      });

      if (!orderRes.ok) throw new Error("Failed to create payment order");
      const orderData = await orderRes.json();
      const paymentSessionId = orderData.payment_session_id;
      const orderId = orderData.order_id;

      // Store pending booking data for redirect handling (fallback)
      localStorage.setItem(`pending_booking_${orderId}`, JSON.stringify({
        listing_id: listing.id,
        guest_id: guestDetails.id,
        host_id,
        start_date: bookingDetails.startDate,
        end_date: bookingDetails.endDate,
        total_price: orderAmount,
        host_payout: parseFloat(currentRoovoBaseTotal.toFixed(2)),
        taxes: parseFloat(totalTax.toFixed(2)),
        our_fees: parseFloat(currentRoovoServiceFeeTotal.toFixed(2)),
        host_fees: 0,
        auto_bookable,
      }));

      if (cashfree) {
        cashfree.checkout({
          paymentSessionId,
          redirectTarget: "_self",
          returnUrl: `${window.location.origin}/payment/status?order_id={order_id}`
        }).then((result: any) => {
          if (result.error) {
            console.error("Payment Error:", result.error);
            setBookingStatus("idle");
            alert("Payment Failed: " + result.error.message);
          }
        });

        const pollInterval = setInterval(async () => {
          const statusRes = await fetch(`${API_BASE_URL}/api/cashfree/orders/${orderId}/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === "SUCCESS") {
              clearInterval(pollInterval);
              await createBooking(orderId);
            }
          }
        }, 5000);

        setTimeout(() => clearInterval(pollInterval), 600000);

        return true;
      }

    } catch (error) {
      console.error(error);
      setBookingStatus("idle");
      return false;
    }

    return false;
  };

  const handlePayPrimaryShare = async () => {
    if (!splitSuccessData || isPayingPrimary) return;
    setIsPayingPrimary(true);

    try {
      const primaryShare = splitSuccessData.splits.find((s: any) => s.is_primary_payer);

      // 2. Create Cashfree Order for ONLY the primary share
      const orderRes = await fetch(`${API_BASE_URL}/api/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_amount: primaryShare.amount_share,
          customer_details: {
            customer_id: guestDetails.id,
            customer_phone: guestDetails.phone || "9999999999",
            customer_name: guestDetails.name || "Guest",
            customer_email: "guest@roovo.in"
          },
          order_meta: {
            return_url: `${window.location.origin}/payment/status?order_id={order_id}`
          }
        })
      });

      if (!orderRes.ok) throw new Error("Failed to create share payment");
      const orderData = await orderRes.json();

      // Update the split record with the actual Cashfree order ID
      await fetch(`${API_BASE_URL}/api/payment-splits/status/${primaryShare.id}/update-order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderData.order_id })
      });

      // Redirect to Cashfree
      if (cashfree) {
        cashfree.checkout({
          paymentSessionId: orderData.payment_session_id,
          redirectTarget: "_self"
        });
      }
    } catch (error) {
      console.error("Error paying primary share:", error);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setIsPayingPrimary(false);
    }
  };

  const createBooking = async (paymentOrderId: string) => {
    // Create Booking after successful payment
    const bookingData = {
      listing_id: listing.id,
      guest_id: guestDetails.id,
      host_id,
      start_date: bookingDetails.startDate,
      end_date: bookingDetails.endDate,
      total_price: grandTotal,
      host_payout: currentRoovoBaseTotal,
      taxes: totalTax,
      our_fees: currentRoovoServiceFeeTotal,
      host_fees: 0,
      auto_bookable,
      payment_order_id: paymentOrderId
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) throw new Error("Failed to create booking");

      setBookingStatus(auto_bookable ? "confirmed" : "pending");
      // Maybe redirect to success page
    } catch (e) {
      console.error("Error creating booking:", e);
      alert("Payment successful but booking creation failed. Please contact support.");
    }
  }

  const formattedStartDate = new Date(bookingDetails.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formattedEndDate = new Date(bookingDetails.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (bookingStatus === "confirmed" || bookingStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-50 relative overflow-hidden font-sans selection:bg-emerald-200 z-[100]">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 150 }}
            className="text-center w-full"
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Booking {bookingStatus === "confirmed" ? "Confirmed" : "Requested"}</h2>
            <p className="text-slate-500 text-sm font-medium tracking-wide leading-relaxed mb-6">
              {bookingStatus === "confirmed"
                ? "Your reservation is securely confirmed. You're all set for your stay!"
                : "Your reservation request has been sent to the host successfully."}
            </p>

            {manualPaymentsEnabled && (
              <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6 flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 mb-1">Payment Method</span>
                <span className="text-xl font-semibold text-slate-900">Pay at Property</span>
                <span className="text-sm text-slate-500 mt-1">₹{(priceDetails.totalPrice + priceDetails.taxes).toFixed(2)}</span>
              </div>
            )}

            <button 
              onClick={() => navigate('/')} 
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl"
            >
              Back to Home
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-50 text-neutral-900 relative font-inter overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 z-40 backdrop-blur-md bg-white/80 border-b border-neutral-200 flex items-center px-4 py-3 shadow-sm">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-neutral-100 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-800" />
        </button>
        <div className="ml-4 text-xl font-semibold text-neutral-800">Confirm and Pay</div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 overflow-y-auto w-full"
      >
        <div className="max-w-md mx-auto px-5 py-6 space-y-6 pb-8">
          {/* Listing Info */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src={resolveImageUrl(listing.primary_image_url)}
                alt={listing.title}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">{listing.title}</h2>
                <div className="flex items-center text-sm text-neutral-600 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 mr-1" />
                  <span>{listing.overall_rating}</span>
                  <span className="ml-1 text-neutral-500">
                    ({listing.total_reviews})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-neutral-500">Dates</span>
              <span>{formattedStartDate} – {formattedEndDate}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-neutral-500">Guests</span>
              <span>{bookingDetails.guests} guest{bookingDetails.guests > 1 ? "s" : ""}</span>
            </div>
            <div className="border-t border-neutral-200 my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{bookingDetails.nights} nights × ₹{priceDetails.pricePerNight.toFixed(2)}</span>
                <span>₹{priceDetails.totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>₹{priceDetails.taxes.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t border-neutral-200 my-4" />
            <div className="flex justify-between text-base font-semibold text-neutral-800">
              <span>Total</span>
              <span>₹{(priceDetails.totalPrice + priceDetails.taxes).toFixed(2)}</span>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
            <h3 className="font-semibold mb-2 text-neutral-800">Cancellation Policy</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {listing.cancellation_policy || "This booking is non-refundable. Please review the host's policy for more details."}
            </p>
          </div>

          {/* Ground Rules */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
            <h3 className="font-semibold mb-2 text-neutral-800">Ground Rules</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Please follow the house rules and treat the place with respect.
            </p>
          </div>

          {/* Split Payment Option */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800">Split with Friends</h3>
                  <p className="text-xs text-neutral-500">Share the cost equally</p>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic();
                  if (!isSplitEnabled) {
                    setIsSplitDrawerOpen(true);
                  } else {
                    setIsSplitEnabled(false);
                    setSplitParticipants([]);
                  }
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${isSplitEnabled ? 'bg-indigo-600' : 'bg-neutral-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSplitEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {isSplitEnabled && (
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 mb-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>{splitParticipants.length + 1} People</span>
                  <span className="font-bold text-indigo-600">₹{(grandTotal / (splitParticipants.length + 1)).toFixed(2)} / each</span>
                </div>
              </div>
            )}

            <div className={`flex gap-3 p-3 rounded-xl transition-all ${isSplitEnabled ? 'bg-amber-50 border border-amber-100' : 'hidden'}`}>
              <ShieldAlert className="text-amber-500 shrink-0" size={16} />
              <p className="text-[10px] text-amber-700 leading-tight">
                Warning: If everyone doesn't pay within 2 hours, the amount will be refunded except for fees.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <SplitPaymentDrawer
        isOpen={isSplitDrawerOpen}
        onClose={() => {
          setIsSplitDrawerOpen(false);
          if (splitSuccessData) {
            // Keep the split data if they close the drawer so they can reopen it?
            // Or maybe clear it if you want them to restart?
            // For now, let's clear it if they close it, or maybe only if they confirm.
          }
        }}
        totalAmount={grandTotal}
        onConfirm={(participants) => {
          setSplitParticipants(participants);
          setIsSplitEnabled(true);
          setIsSplitDrawerOpen(false);
          triggerHaptic();
        }}
        successData={splitSuccessData}
        onPayPrimary={handlePayPrimaryShare}
      />

      {/* Fixed Footer for Slide to Reserve */}
      <div className="flex-shrink-0 bg-white border-t border-neutral-100 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.08)] z-40">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-[2rem]">
            <SlideToReserve
              onSlide={handleBooking}
              text={manualPaymentsEnabled ? "Book & Pay at Property" : "Slide to Reserve"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
