import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/utils/pricingCalculator";
import Toast from "../ui/toast";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";
import SlidingNumber from "../ui/SlidingNumber";
import { Spinner } from "../ui/shadcn-io/spinner";
import { Drawer } from "vaul";
import { useBackCloseable } from "@/hooks/useBackCloseable";

interface PricingWizardProps {
  airbnbPrice: number; // Airbnb guest pays (SOURCE OF TRUTH)
  currentDiscountedPrice?: number; // Effective price after Airbnb discounts
  enableRoomSplitting?: boolean;
  bedroomCount?: number;
  onNext: (pricing: { basePrice: number; weekendPrice: number; roomPrices?: number[]; enableRoomSplitting?: boolean }) => void;
  onBack: () => void;
}

type ValueTier = "highest" | "great" | "good";
type PricingStep = "entire_house" | "room";

export default function PricingWizard({
  airbnbPrice,
  currentDiscountedPrice,
  enableRoomSplitting = false,
  bedroomCount = 3,
  onNext,
  onBack,
}: PricingWizardProps) {
  /* -------------------------------------------------------------
     🔒 PRICING RULES (FINAL & CORRECT)
  ------------------------------------------------------------- */

  // Step State
  const [step, setStep] = useState<PricingStep>("entire_house");

  // airbnbPrice prop IS "Airbnb Guest Pays" (e.g. 3293)
  // We reverse calculate the Listing Price (approx 14% guest fee)
  // Listing Price + 14% = Guest Pays
  // Listing Price = Guest Pays / 1.14
  const LISTING_PRICE = Math.round(airbnbPrice / 1.14);

  // Airbnb Host Fee is 3% of Listing Price
  const AIRBNB_HOST_NET = Math.round(LISTING_PRICE * 0.97);

  // Roovo guest pays 8% less than Airbnb Guest Total
  const ROOVO_GUEST_PRICE = Math.round(airbnbPrice * 0.92);

  // Slider boundaries (host earnings)
  const MIN_EARNING = AIRBNB_HOST_NET;
  const MAX_EARNING = ROOVO_GUEST_PRICE;

  /* -------------------------------------------------------------
     ROOM PRICING LOGIC
  ------------------------------------------------------------- */
  // Default room price estimation: Entire Price / Bedrooms * 1.2 (20% premium for individual rooms)
  const INITIAL_ROOM_PRICE = Math.round((MIN_EARNING / bedroomCount) * 1.2);
  const MIN_ROOM_PRICE = Math.round(INITIAL_ROOM_PRICE * 0.8);
  const MAX_ROOM_PRICE = Math.round(INITIAL_ROOM_PRICE * 1.5);

  /* -------------------------------------------------------------
     STATE
  ------------------------------------------------------------- */

  const [hostEarning, setHostEarning] = useState(MIN_EARNING);
  // Room Prices State (Array)
  const [roomPrices, setRoomPrices] = useState<number[]>([]);

  // Initialize room prices when bedrooms or base price changes
  useEffect(() => {
    if (bedroomCount > 0 && roomPrices.length === 0) {
      // Estimate room price: (Roovo Earning * 1.5) / Bedrooms 
      // (Multiplier because sum of rooms usually > whole house)
      const initialRoomPrice = Math.round((hostEarning * 1.3) / bedroomCount);
      const clampedPrice = Math.max(MIN_ROOM_PRICE, Math.min(MAX_ROOM_PRICE, initialRoomPrice));
      setRoomPrices(new Array(bedroomCount).fill(clampedPrice));
    }
  }, [bedroomCount, hostEarning]);

  const handleRoomPriceChange = (index: number, val: number) => {
    const newPrices = [...roomPrices];
    newPrices[index] = val;
    setRoomPrices(newPrices);
  };

  const applyFirstToAll = () => {
    if (roomPrices.length > 0) {
      const firstPrice = roomPrices[0];
      setRoomPrices(new Array(bedroomCount).fill(firstPrice));
    }
  }; const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Hardware back closes the drawer instead of navigating
  useBackCloseable(isDrawerOpen, () => setIsDrawerOpen(false));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weekendPremium, setWeekendPremium] = useState(15);

  /* -------------------------------------------------------------
     VALUE TIER (REAL MONEY BASED)
  ------------------------------------------------------------- */

  const valueTier = useMemo<ValueTier>(() => {
    const uplift = hostEarning - AIRBNB_HOST_NET;
    if (uplift <= AIRBNB_HOST_NET * 0.05) return "good";
    if (uplift <= AIRBNB_HOST_NET * 0.12) return "great";
    return "highest";
  }, [hostEarning, AIRBNB_HOST_NET]);

  const prevTier = useRef<ValueTier | null>(null);

  useEffect(() => {
    if (prevTier.current && prevTier.current !== valueTier) {
      triggerHaptic();
    }
    prevTier.current = valueTier;
  }, [valueTier]);

  /* -------------------------------------------------------------
     ACTIONS
  ------------------------------------------------------------- */

  const handleContinue = () => {
    if (step === "entire_house") {
      if (hostEarning < MIN_EARNING || hostEarning > MAX_EARNING) {
        setToast({ message: "Invalid earning range", type: "error" });
        triggerErrorHaptic();
        return;
      }

      if (enableRoomSplitting) {
        setStep("room");
        triggerHaptic();
      } else {
        setIsDrawerOpen(true);
      }
    } else {
      // Room Step
      setIsDrawerOpen(true);
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);

    const weekendPrice = Math.round(hostEarning * (1 + weekendPremium / 100));

    setTimeout(() => {
      onNext({
        basePrice: hostEarning,
        weekendPrice,
        roomPrices: enableRoomSplitting ? roomPrices : undefined,
        enableRoomSplitting: enableRoomSplitting,
      });
      setIsSubmitting(false);
      setIsDrawerOpen(false);
    }, 500);
  };

  /* -------------------------------------------------------------
     UI
  ------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-white border-b px-5 py-4 sticky top-0 z-10 transition-all">
        <div className="flex items-center justify-between">
          <button
            onClick={step === 'room' ? () => setStep('entire_house') : onBack}
            className="text-indigo-600 font-semibold"
          >
            Back
          </button>
          {enableRoomSplitting && (
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full transition-all ${step === 'entire_house' ? 'bg-indigo-600 w-6' : 'bg-indigo-200'}`} />
              <div className={`w-2 h-2 rounded-full transition-all ${step === 'room' ? 'bg-indigo-600 w-6' : 'bg-indigo-200'}`} />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold mt-2">
          {step === 'entire_house' ? "Set Your Earnings" : "Set Room Price"}
        </h2>
        <p className="text-sm text-gray-500">
          {step === 'entire_house' ? "Guests pay less than Airbnb. You earn more." : "How much for just one room?"}
        </p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-6 max-w-xl mx-auto w-full pb-32">

        <AnimatePresence mode="wait">
          {step === 'entire_house' ? (
            <motion.div
              key="entire_house"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* MAIN CARD */}
              <div className="bg-white p-6 rounded-3xl border border-indigo-100 ring-4 ring-indigo-50">
                {/* Discount Banner */}
                {currentDiscountedPrice && currentDiscountedPrice < airbnbPrice && (
                  <div className="mb-6 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-600" />
                    <span>Running <b>{Math.round(((airbnbPrice - currentDiscountedPrice) / airbnbPrice) * 100)}% discount</b> on Airbnb. We applied this to Roovo too.</span>
                  </div>
                )}

                <label className="text-xs font-semibold text-gray-400 uppercase text-center block mb-8">
                  Potential Monthly Earnings (20 Nights)
                </label>

                {/* EARNINGS BAR CHART */}
                <div className="flex items-end justify-center gap-8 h-64 mb-8">
                  {/* Airbnb Bar */}
                  <div className="flex flex-col items-center gap-2 w-28 group">
                    <span className="text-xs font-bold text-gray-400">Airbnb</span>
                    <div className="w-full bg-gray-100 rounded-t-2xl relative flex items-end justify-center pb-2 group-hover:bg-gray-200 transition-colors" style={{ height: '120px' }}>
                      <span className="font-bold text-gray-600 text-sm">{formatCurrency(AIRBNB_HOST_NET * 20)}</span>
                    </div>
                  </div>

                  {/* Roovo Bar (Dynamic) */}
                  <div className="flex flex-col items-center gap-2 w-28 relative">
                    {/* Percent Badge */}
                    <div className="absolute -top-10 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                      +{Math.round(((hostEarning - AIRBNB_HOST_NET) / AIRBNB_HOST_NET) * 100)}% More
                    </div>

                    <span className="text-xs font-bold text-indigo-600">Roovo</span>
                    <motion.div
                      className="w-full bg-indigo-500 rounded-t-2xl relative flex items-end justify-center pb-2 shadow-indigo-200 shadow-lg"
                      initial={{ height: '120px' }}
                      animate={{ height: `${120 + ((hostEarning - AIRBNB_HOST_NET) / AIRBNB_HOST_NET) * 600}px` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                      style={{ minHeight: '120px', maxHeight: '210px' }}
                    >
                      <span className="font-bold text-white text-lg">{formatCurrency(hostEarning * 20)}</span>
                    </motion.div>
                  </div>
                </div>

                {/* SLIDER */}
                <input
                  type="range"
                  min={MIN_EARNING}
                  max={MAX_EARNING}
                  value={hostEarning}
                  onChange={(e) => setHostEarning(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600 h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex justify-between text-xs text-gray-400 mt-3 font-medium">
                  <span>Match Airbnb</span>
                  <span>Max Earning</span>
                </div>

                <p className="text-xs text-center text-gray-400 mt-6">
                  Guest pays {formatCurrency(hostEarning)} • 0% Roovo platform fee
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* ROOM PRICE CARD */}
              <div className="bg-white p-6 rounded-3xl border border-indigo-100 ring-4 ring-indigo-50">
                <div className="flex justify-between items-center mb-6">
                  <label className="text-xs font-semibold text-gray-400 uppercase">
                    Price Per Room (Nightly)
                  </label>
                  {bedroomCount > 1 && (
                    <button
                      onClick={applyFirstToAll}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Set all to Room 1
                    </button>
                  )}
                </div>

                <div className="space-y-8">
                  {roomPrices.map((price, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-gray-700">Room {idx + 1}</span>
                        <div className="flex items-end gap-1">
                          <span className="text-lg text-gray-400">₹</span>
                          <span className="text-3xl font-bold text-indigo-600">
                            <SlidingNumber value={price} />
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={MIN_ROOM_PRICE}
                        max={MAX_ROOM_PRICE}
                        value={price}
                        onChange={(e) => handleRoomPriceChange(idx, Number(e.target.value))}
                        className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>Min</span>
                        <span>Max</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Smart Splitting</h4>
                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                      This price applies when guests book just 1 room. We'll automatically adjust if they book 2 rooms.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleContinue}
            className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all"
          >
            {step === 'entire_house' && enableRoomSplitting ? "Next: Room Pricing" : "Continue"}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* WEEKEND DRAWER */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="bg-white rounded-t-3xl h-[60vh] fixed bottom-0 left-0 right-0 z-50">
            <div className="p-6 flex flex-col h-full">

              {/* HEADER */}
              <div>
                <h2 className="text-xl font-bold">Weekend Pricing</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Charge more on high-demand days
                </p>
              </div>

              {/* BIG VALUE DISPLAY */}
              <div className="mt-8 text-center">
                <div className="text-sm font-semibold text-indigo-500 uppercase tracking-wide">
                  Weekend premium
                </div>

                <div className="mt-2 text-4xl font-bold text-indigo-700">
                  +{weekendPremium}%
                </div>

                <div className="mt-2 text-lg font-semibold text-gray-800">
                  {formatCurrency(
                    Math.round(hostEarning * (1 + weekendPremium / 100))
                  )}{" "}
                  per night
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Based on weekday earning of {formatCurrency(hostEarning)}
                </div>
              </div>

              {/* SLIDER */}
              <div className="mt-8">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={weekendPremium}
                  onChange={(e) => setWeekendPremium(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />

                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="mt-auto w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold"
              >
                {isSubmitting ? <Spinner /> : "Confirm & Continue"}
              </button>
            </div>
          </Drawer.Content>

        </Drawer.Portal>
      </Drawer.Root>

      {toast && (
        <Toast
          message={toast.message}
          isVisible={!!toast}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
