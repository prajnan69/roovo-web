"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { Spinner } from "./ui/shadcn-io/spinner";
import supabase, { API_BASE_URL } from "../services/api";
import SlideToReserve from "./SlideToReserve";

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
}

export default function ConfirmAndPay({
  listing,
  bookingDetails,
  priceDetails,
  onBack,
  host_id,
  auto_bookable,
}: ConfirmAndPayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<
    "idle" | "loading" | "confirmed" | "pending"
  >("idle");

  const handleBooking = async (): Promise<boolean> => {
    setIsLoading(true);
    setBookingStatus("loading");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const guest_id = session.user.id;
    const bookingData = {
      listing_id: listing.id,
      guest_id,
      host_id,
      start_date: bookingDetails.startDate,
      end_date: bookingDetails.endDate,
      total_price: priceDetails.totalPrice + priceDetails.taxes,
      auto_bookable,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // simulate delay
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) throw new Error("Failed to create booking");

      setBookingStatus(auto_bookable ? "confirmed" : "pending");
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const formattedStartDate = new Date(bookingDetails.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formattedEndDate = new Date(bookingDetails.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 relative font-inter">

      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-neutral-200 flex items-center px-4 py-3 shadow-sm">
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
        className="max-w-md mx-auto px-5 py-6 space-y-6"
      >
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
          <p className="text-neutral-600 text-sm leading-relaxed">
            {listing.cancellation_policy}
          </p>
        </div>

        {/* Slide to Reserve */}
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-neutral-100 via-white/90 backdrop-blur-md border-t border-neutral-200">
          <AnimatePresence>
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center py-4"
              >
                <Spinner />
              </motion.div>
            ) : (
              <SlideToReserve onSlide={handleBooking} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
