"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Building2, Wallet, BadgeCheck, TrendingUp } from "lucide-react";
import BestValueBadgeInfo from "../BestValueBadgeInfo";
import supabase from "@/services/api";
import { useNavigate } from "react-router-dom";
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import { type ListingData } from "@/types";
import { Switch } from "@/components/ui/switch";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Spinner } from "@/components/ui/shadcn-io/spinner";

interface ConfirmPriceAndListProps {
  hostName: string;
  importedListingId: string;
  scrapedData: ListingData;
  onConfirm: (price: number, weekendPrice: number, model: "casual", autoBookable: boolean, listingId: string) => void;
}

// --- NEW / UPDATED CONSTANTS ---
// Airbnb exact charges per your clarification:
const AIRBNB_GUEST_FEE = 0.14; // 14% charged to guest (displayed on Airbnb)
const AIRBNB_HOST_FEE = 0.03; // 3% charged to host (per booking)
const GST_RATE = 0.18; // 18% GST applicable on service fee portions where relevant

// Roovo model
const ROOVO_DISCOUNT_PERCENT = 3; // host lists 3% below Airbnb guest-facing price
const ROOVO_GUEST_FEE = 0.03; // 3% guest service fee on Roovo (visible to guest)
const ROOVO_PAYOUT_FEE = 0.03; // 3% fee at payout (applies after 20 free bookings)
const AIRBNB_PRICE_REDUCTION = 0.09; // 9% reduction from Airbnb guest price
const PROJECTION_DAYS = 20; // projection window for dramatic comparison

export default function ConfirmPriceAndList({
  hostName,
  scrapedData,
  onConfirm,
  importedListingId,
}: ConfirmPriceAndListProps) {
  const navigate = useNavigate();
  const [discountPercent, setDiscountPercent] = useState(ROOVO_DISCOUNT_PERCENT);
  const [autoBookable, setAutoBookable] = useState(true);
  const [weekendPremium, setWeekendPremium] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Sticky on mobile
  useEffect(() => {
    const handleScroll = () => {
      if (!sliderRef.current) return;
      const top = sliderRef.current.getBoundingClientRect().top;
      setIsSticky(top <= 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- CALCULATIONS ---
  const calculations = useMemo(() => {
    // 1) Source price: Airbnb guest-facing price (scraped)
    const initialAirbnbGuestPrice = scrapedData.booking_and_availability.price.pricePerNight;
    const airbnbGuestPrice = initialAirbnbGuestPrice * (1 - AIRBNB_PRICE_REDUCTION);

    // 2) Roovo host price = Airbnb guest price reduced by discountPercent (default 9%)
    const roovoHostPrice = airbnbGuestPrice * (1 - discountPercent / 100);

    // 3) Roovo guest displayed price = roovoHostPrice + Roovo guest fee (round to nearest ₹10)
    const rawRoovoGuest = roovoHostPrice * (1 + ROOVO_GUEST_FEE);
    const roovoGuestPrice = Math.round(rawRoovoGuest / 10) * 10;

    // 4) Airbnb host receives: Airbnb guest price less Airbnb guest fee fraction? Clarify:
    //    Airbnb displays a guest price that includes the guest service fee (14%).
    //    Host payout for a booking equals the base amount less host fee (3%) + GST on that host fee.
    //    For simplicity, consider Airbnb base (guest price /(1 + guest fee)) as listing base:
    const airbnbBaseBeforeGuestFee = initialAirbnbGuestPrice / (1 + AIRBNB_GUEST_FEE); // theoretical listing base
    const airbnbHostFeeAmount = airbnbBaseBeforeGuestFee * AIRBNB_HOST_FEE;
    const airbnbHostGSTonFee = airbnbHostFeeAmount * GST_RATE; // host pays GST on host fee portion
    const airbnbHostReceives = airbnbBaseBeforeGuestFee - airbnbHostFeeAmount - airbnbHostGSTonFee;

    // 5) Roovo host receives (during free-20 booking window): full roovoHostPrice
    const roovoHostReceivesBeforePayoutFee = roovoHostPrice;
    // After 20 bookings payout fee would apply: show both values for clarity
    const roovoHostReceivesAfterPayoutFee = roovoHostPrice * (1 - ROOVO_PAYOUT_FEE);

    // 6) For projections (PROJECTION_DAYS), compute totals
    const projectionDays = PROJECTION_DAYS;
    const airbnbHostTotal = airbnbHostReceives * projectionDays;
    const roovoHostTotalBefore = roovoHostReceivesBeforePayoutFee * projectionDays;
    const roovoHostTotalAfter = roovoHostReceivesAfterPayoutFee * projectionDays;

    // 7) Platform revenue (Roovo) from guest fee over projection (you also might earn payout-fee later)
    const roovoPlatformFromGuestFees = (roovoGuestPrice - roovoHostPrice) * projectionDays; // approx
    const roovoPlatformFromPayoutFees = (roovoHostReceivesBeforePayoutFee - roovoHostReceivesAfterPayoutFee) * projectionDays;

    // 8) Savings / delta
    const guestSavingsPerNight = initialAirbnbGuestPrice - roovoGuestPrice;
    const hostGainPerNightBefore = roovoHostPrice - airbnbHostReceives;
    const hostGainPerNightAfter = roovoHostReceivesAfterPayoutFee - airbnbHostReceives;
    const weekendPrice = roovoHostPrice * (1 + weekendPremium / 100);

    console.log({
      initialAirbnbGuestPrice,
      airbnbGuestPrice,
      roovoHostPrice,
      roovoGuestPrice,
      airbnbBaseBeforeGuestFee,
      airbnbHostFeeAmount,
      airbnbHostGSTonFee,
      airbnbHostReceives,
      roovoHostReceivesBeforePayoutFee,
      roovoHostReceivesAfterPayoutFee,
      projectionDays,
      airbnbHostTotal,
      roovoHostTotalBefore,
      roovoHostTotalAfter,
      roovoPlatformFromGuestFees,
      roovoPlatformFromPayoutFees,
      guestSavingsPerNight,
      hostGainPerNightBefore,
      hostGainPerNightAfter,
      weekendPrice,
    });

    return {
      airbnbGuestPrice,
      airbnbBaseBeforeGuestFee,
      airbnbHostFeeAmount,
      airbnbHostGSTonFee,
      airbnbHostReceives,
      roovoHostPrice,
      roovoGuestPrice,
      roovoHostReceivesBeforePayoutFee,
      roovoHostReceivesAfterPayoutFee,
      projectionDays,
      airbnbHostTotal,
      roovoHostTotalBefore,
      roovoHostTotalAfter,
      roovoPlatformFromGuestFees,
      roovoPlatformFromPayoutFees,
      guestSavingsPerNight,
      hostGainPerNightBefore,
      hostGainPerNightAfter,
      weekendPrice,
    };
  }, [scrapedData, discountPercent, weekendPremium]);

  const {
    airbnbGuestPrice,
    airbnbHostReceives,
    roovoHostPrice,
    roovoGuestPrice,
    roovoHostReceivesBeforePayoutFee,
    projectionDays,
    airbnbHostTotal,
    roovoHostTotalBefore,
    roovoHostTotalAfter,
    guestSavingsPerNight,
    weekendPrice,
  } = calculations;

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
    }),
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('kyc')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        onConfirm(Math.round(roovoHostPrice / 10) * 10, Math.round(weekendPrice / 10) * 10, "casual", autoBookable, importedListingId);
      } else {
        navigate('/verify');
      }
    }
    setIsConfirming(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Welcome, {hostName} — Price & List</h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            We imported the Airbnb guest price and calculated a Roovo price that makes your listing more competitive —
            guests pay less, and you earn the same or more.
          </p>
        </motion.div>

        {/* Slider / Mobile sticky */}
        <div ref={sliderRef} className="md:hidden mb-8">
          <div className={`${isSticky ? "fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200" : "bg-white rounded-2xl shadow-lg border border-gray-200"}`}>
            <div className="p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="text-green-500 w-5 h-5" />
                <h2 className="text-lg font-semibold text-gray-900">Roovo Pricing Preview</h2>
              </div>
              <p className="text-sm text-gray-600 text-center mb-3">
                Airbnb guest price: <span className="font-semibold">₹{airbnbGuestPrice.toFixed(0)}</span>
              </p>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="w-16 text-right">
                  <div className="text-indigo-600 font-bold">{discountPercent}%</div>
                  <div className="text-xs text-gray-500">discount</div>
                </div>
              </div>

              <div className="mt-3 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500">New Roovo price</div>
                  <div className="text-xl font-bold text-gray-900">₹<SlidingNumber number={roovoHostPrice} decimalPlaces={0} /></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Guest pays</div>
                  <div className="text-lg font-semibold text-gray-900">₹<SlidingNumber number={roovoGuestPrice} decimalPlaces={0} /></div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <BadgeCheck size={14} /> Competitive price unlocked
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Weekend Price Premium</h2>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={weekendPremium}
                    onChange={(e) => setWeekendPremium(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="w-16 text-right">
                    <div className="text-indigo-600 font-bold">{weekendPremium}%</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500">Weekend price</div>
                    <div className="text-xl font-bold text-gray-900">₹<SlidingNumber number={weekendPrice} decimalPlaces={0} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={isSticky ? "h-[170px]" : ""} />
        </div>

        {/* Desktop Slider */}
        <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} className="hidden md:block bg-white p-8 rounded-2xl shadow-lg border border-gray-200 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <TrendingUp className="text-green-500 w-6 h-6" />
            <h2 className="text-2xl font-bold text-gray-900">Roovo Price Slider</h2>
          </div>
          <p className="text-gray-600 mb-4">
            The maximum price that this property can be listed on Roovo is <span className="font-semibold">₹{airbnbGuestPrice.toFixed(0)}</span>
            — adjust the discount to see how it impacts your earnings and guest savings.
          </p>

          <div className="flex items-center gap-6 mb-6">
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-indigo-600">{discountPercent}%</span>
              <span className="text-sm text-gray-500">Discount</span>
            </div>
          </div>

          <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
            <div>
              <div className="text-sm text-gray-500">Roovo Price</div>
              <div className="text-3xl font-bold text-gray-900">₹<SlidingNumber number={roovoHostPrice} decimalPlaces={0} /></div>
            </div>
            {discountPercent >= 3 && (
              <div className="ml-4">
                <AnimatedShinyText className="border-indigo-500">🏆 Best Value</AnimatedShinyText>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">A better discount improves visibility in the application.</p>
          <div className="mt-6">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Weekend Price Premium</h2>
            </div>
            <div className="flex items-center gap-6 mb-6">
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={weekendPremium}
                onChange={(e) => setWeekendPremium(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-indigo-600">{weekendPremium}%</span>
                <span className="text-sm text-gray-500">Premium</span>
              </div>
            </div>
            <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
              <div>
                <div className="text-sm text-gray-500">Weekend Price</div>
                <div className="text-3xl font-bold text-gray-900">₹<SlidingNumber number={weekendPrice} decimalPlaces={0} /></div>
              </div>
            </div>
          </div>
        </motion.div>

        {showBadgeInfo && (
          <BestValueBadgeInfo onClose={() => setShowBadgeInfo(false)} airbnbBasePrice={scrapedData.booking_and_availability.price.pricePerNight} />
        )}

        {/* EARNINGS / COMPARISON */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2} className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-900">Airbnb vs Roovo — {projectionDays}-day Projection</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Airbnb */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center">
              <Building2 className="w-7 h-7 mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">Airbnb (current)</h3>
              <p className="text-xs text-gray-500 mb-2">Guest fee: 14% • Host fee: 3% + GST</p>

              <div className="text-3xl font-extrabold mt-3 text-gray-900">₹<SlidingNumber number={airbnbHostReceives} decimalPlaces={0} /></div>
              <div className="mt-2 text-sm text-red-600">Host takes home per night</div>

              <div className="mt-4 bg-gray-100 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Over {projectionDays} days:</div>
                <div className="text-lg font-bold mt-1 text-gray-900">₹<SlidingNumber number={airbnbHostTotal} decimalPlaces={0} /></div>
                <div className="text-xs text-red-600 mt-1">Net after Airbnb fees & GST on host fee</div>
              </div>
            </div>

            {/* Roovo */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-6 rounded-2xl border border-indigo-500 text-center shadow-lg transform scale-101">
              <Wallet className="w-7 h-7 mx-auto text-white mb-3" />
              <h3 className="text-base font-semibold text-white">Roovo (recommended)</h3>
              <div className="text-3xl font-extrabold mt-3 text-white">₹<SlidingNumber number={roovoHostReceivesBeforePayoutFee} decimalPlaces={0} /></div>
              <div className="mt-2 text-sm text-indigo-200">Host takes home per night (first 20 bookings)</div>

              <div className="mt-4 bg-indigo-700/30 p-3 rounded-lg">
                <div className="text-sm text-indigo-200">Over {projectionDays} days:</div>
                <div className="text-lg font-bold mt-1 text-white">₹<SlidingNumber number={roovoHostTotalBefore} decimalPlaces={0} /></div>
                <div className="text-xs text-indigo-200 mt-1">You keep full payout for first 20 bookings</div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-indigo-100">After 20 bookings → {Math.round(ROOVO_PAYOUT_FEE * 100)}% payout fee applies</div>
                <div className="text-sm text-indigo-100 mt-1">Projected net (if payout fee applied): ₹<SlidingNumber number={roovoHostTotalAfter} decimalPlaces={0} /></div>
              </div>
            </div>

            {/* Delta / Highlight */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="text-3xl font-extrabold text-green-500">₹<SlidingNumber number={Math.max(0, roovoHostTotalBefore - airbnbHostTotal)} decimalPlaces={0} /></div>
              </div>
              <div className="text-sm text-gray-600">Extra you keep over {projectionDays} days vs Airbnb</div>

              <div className="mt-4 p-3 rounded-lg bg-gray-100">
                <div className="text-sm text-gray-500">Per night difference</div>
                <div className="text-2xl font-bold mt-1 text-gray-900">₹<SlidingNumber number={Math.max(0, roovoHostReceivesBeforePayoutFee - airbnbHostReceives)} decimalPlaces={0} /></div>
                <div className="text-xs text-gray-500 mt-1">Roovo advantage per night (first 20 bookings)</div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Guests save <span className="font-semibold">₹{guestSavingsPerNight.toFixed(0)}</span> per night vs Airbnb.
              </div>
            </div>
          </div>
        </motion.section>

        {/* Confirm */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-10 bg-white p-6 rounded-2xl border border-gray-200">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900">Confirm & List on Roovo</h3>
            <p className="mt-2 text-sm text-gray-600">We will list your property at the Roovo host price and show guests the competitive Roovo guest price.</p>
          </div>

          <div className="flex items-center justify-center mt-6 gap-3">
            <Switch id="auto-bookable" checked={autoBookable} onCheckedChange={setAutoBookable} />
            <label htmlFor="auto-bookable" className="text-sm text-gray-600">{autoBookable ? "Auto Bookable" : "Manual Confirmation"}</label>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="w-full mt-8 inline-flex items-center justify-center gap-3 bg-indigo-500 text-white px-6 py-4 rounded-full shadow-lg text-lg font-semibold"
            disabled={isConfirming}
          >
            {isConfirming ? <Spinner /> : "Confirm Pricing & List on Roovo"}
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Note: Roovo charges a small <strong>3% guest fee</strong> (included in guest price) — you keep full payout for the first 20 bookings, after which a <strong>3% payout fee</strong> applies on payout.
          </div>
        </motion.section>
      </div>
    </div>
  );
}
