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
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="text-2xl font-bold mb-4">Booking {bookingStatus === "confirmed" ? "Confirmed" : "Requested"}!</div>
        <p className="text-center text-gray-600 px-6">
          {bookingStatus === "confirmed"
            ? "Your reservation is confirmed. Enjoy your stay!"
            : "Your reservation request has been sent to the host."}
        </p>
        <button onClick={onBack} className="mt-8 px-6 py-3 bg-black text-white rounded-full">Back to Listing</button>
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
                src={listing.primary_image_url}
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
