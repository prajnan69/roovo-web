import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

const BookingBar = ({
  price,
  onReserveClick,
  airbnbPrice,
  airbnbTotal,
  nights = 1,
  loadingAirbnbPrice,
  airbnbAvailable = true,
  onChatClick,
  showPrice = true,
  buttonText = "Reserve",
  showChat = true,
  isFeeWaived = false,
  userId,
  userName,
  userPhone,
  listingId,
  listingTitle
}: {
  price: number,
  onReserveClick: () => void,
  airbnbPrice?: number | null,
  airbnbTotal?: number | null,
  nights?: number,
  totalPrice?: number,
  loadingAirbnbPrice?: boolean,
  airbnbAvailable?: boolean,
  onChatClick?: () => void,
  showPrice?: boolean,
  buttonText?: string,
  showChat?: boolean,
  isFeeWaived?: boolean,
  userId?: string,
  userName?: string,
  userPhone?: string,
  listingId?: string,
  listingTitle?: string
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [displayMode, setDisplayMode] = useState<'per_night' | 'total'>(nights > 1 ? 'total' : 'per_night');

  // Lead Reporting State
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // React to nights count updating
  useEffect(() => {
    if (nights > 1) {
      setDisplayMode('total');
    } else {
      setDisplayMode('per_night');
    }
  }, [nights]);

  // Animation for price scaling
  const [isPulsing, setIsPulsing] = useState(false);
  useEffect(() => {
    if (isFeeWaived) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isFeeWaived]);

  // Effective base price and service fee logic
  // If not waived, the 'price' passed initially is the base.
  // We want to show a 3% service fee if not waived.
  const serviceFeePercent = isFeeWaived ? 0 : 0.03;
  const basePricePerNight = price;
  const serviceFeePerNight = basePricePerNight * serviceFeePercent;
  const displayPricePerNight = isFeeWaived ? basePricePerNight : (basePricePerNight + serviceFeePerNight);

  const currentRoovoBaseTotal = basePricePerNight * nights;
  const currentRoovoServiceFeeTotal = serviceFeePerNight * nights;
  const currentRoovoTotal = isFeeWaived ? currentRoovoBaseTotal : (currentRoovoBaseTotal + currentRoovoServiceFeeTotal);

  const compareAirbnbTotal = airbnbTotal || (airbnbPrice ? airbnbPrice * nights : null);
  const compareAirbnbPerNight = airbnbPrice || (airbnbTotal ? airbnbTotal / nights : null);

  // Tax Logic
  // Room Rent GST: Up to 7,500 = 12%, Above 7,500 = 18%
  const roomGstRate = basePricePerNight > 7500 ? 0.18 : 0.12;
  const roomGstTotal = currentRoovoBaseTotal * roomGstRate;

  // Service Fee GST: 18% (only if fee exists)
  const serviceFeeGstTotal = currentRoovoServiceFeeTotal * 0.18;

  const totalTax = roomGstTotal + serviceFeeGstTotal;
  const grandTotal = currentRoovoTotal + totalTax;

  const savingsTotal = (compareAirbnbTotal && compareAirbnbTotal > currentRoovoTotal)
    ? compareAirbnbTotal - currentRoovoTotal
    : 0;

  const discountPercent = compareAirbnbTotal
    ? Math.round((savingsTotal / compareAirbnbTotal) * 100)
    : 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 w-full z-50"
    >
      {/* Glassmorphism Container */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200/50 px-4 md:px-6 py-3 md:py-4 pb-6 md:pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 md:gap-4">

          {/* Price Section */}
          <div
            className="flex flex-col justify-center min-w-0 shrink cursor-pointer active:scale-95 transition-transform"
            onClick={() => {
              triggerHaptic();
              setShowBreakdown(true);
            }}
          >
            {showPrice ? (
              <>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <motion.div
                    animate={isPulsing ? { scale: [1, 1.3, 1], zIndex: 60 } : { scale: 1 }}
                    transition={{ duration: 0.8, times: [0, 0.4, 1], ease: "anticipate" }}
                    className="flex items-baseline gap-1 whitespace-nowrap"
                  >
                    <span className="text-xl md:text-2xl font-bold text-slate-900">
                      ₹<SlidingNumber
                        number={Math.round(displayMode === 'total' ? currentRoovoTotal : displayPricePerNight)}
                        padStart={false}
                      />
                    </span>
                    <span className="text-xs md:text-sm font-medium text-slate-500">
                      {displayMode === 'total' ? `/ ${nights} nights` : '/ night'}
                    </span>
                    {nights > 1 && (
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {displayMode === 'total' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Market Price Check / Savings Display */}
                  <AnimatePresence mode="wait">
                    {loadingAirbnbPrice ? (
                      <motion.div
                        key="checking"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold shadow-sm whitespace-nowrap"
                      >
                        🔍 Checking Market Price...
                      </motion.div>
                    ) : !airbnbAvailable || !compareAirbnbTotal ? (
                      <motion.div
                        key="exclusive"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm whitespace-nowrap"
                        onClick={() => setShowBreakdown(true)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Exclusive Price
                      </motion.div>
                    ) : savingsTotal > 0 ? (
                      <motion.div
                        key="savings"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBreakdown(true);
                        }}
                      >
                        {discountPercent < 100 ? `${discountPercent}% OFF` : `SAVE ₹${Math.round(displayMode === 'total' ? savingsTotal : (savingsTotal / nights)).toLocaleString()}`}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Comparison Text */}
                <div
                  className="h-4 md:h-5 flex items-center mt-0.5 md:mt-1 overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBreakdown(true);
                  }}
                >
                  <AnimatePresence mode="wait">
                    {isFeeWaived ? (
                      <motion.div
                        key="best-price-loyalty"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-green-600 whitespace-nowrap"
                      >
                        <Sparkles size={12} className="text-yellow-500" />
                        Best price on the internet
                      </motion.div>
                    ) : !loadingAirbnbPrice && airbnbAvailable && compareAirbnbTotal && compareAirbnbTotal > currentRoovoTotal ? (
                      <motion.div
                        key="comparison"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center gap-1 text-[10px] md:text-xs text-slate-500 whitespace-nowrap"
                      >
                        <span className="text-red-500 line-through">
                          Airbnb: ₹{Math.round(displayMode === 'total' ? compareAirbnbTotal : compareAirbnbPerNight!).toLocaleString()}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-green-600 flex items-center gap-1">
                          <Check size={12} /> Roovo Price Matched
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="guaranteed"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-slate-500 whitespace-nowrap"
                      >
                        Best price guaranteed
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center">
                <span className="text-sm font-medium text-slate-500">
                  Add dates for prices
                </span>
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Chat Button - Secondary Action */}
            {showChat && (
              <motion.button
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 active:bg-slate-100 transition-colors"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic();
                  onChatClick?.();
                }}
                aria-label="Chat with host"
              >
                <MessageCircle className="w-5 h-5" />
              </motion.button>
            )}

            {/* Reserve Button - Primary Action */}
            <motion.button
              onClick={() => {
                triggerHaptic();
                onReserveClick();
              }}
              className="relative overflow-hidden px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 active:shadow-sm transition-all"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
            >
              <span className="relative z-10 flex items-center gap-2 text-sm md:text-base">
                {buttonText}
              </span>
              {/* Subtle shine effect overlay */}
              <div className="absolute inset-0 bg-white/20 translate-y-full skew-y-12 group-hover:translate-y-[-150%] transition-transform duration-700 ease-in-out" />
            </motion.button>
          </div>
        </div>
      </div>

      <Drawer open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DrawerContent className="bg-white">
          <div className="mx-auto w-full max-w-md pb-8">
            <DrawerHeader>
              <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                Price Comparison
                <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Best Price</span>
              </DrawerTitle>
              <DrawerDescription>Detailed price breakdown for {nights} night(s)</DrawerDescription>
            </DrawerHeader>

            <div className="px-6 space-y-6">
              {/* Comparison Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <p className="text-xs font-medium text-slate-500 mb-1">Airbnb Total</p>
                  {compareAirbnbTotal ? (
                    <>
                      <p className="text-lg font-bold text-slate-900 line-through decoration-red-400 opacity-60">
                        ₹{compareAirbnbTotal?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">₹{compareAirbnbPerNight?.toLocaleString()} / night</p>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-slate-400 italic">Not Found</p>
                      <p className="text-[10px] text-slate-400">Comparison Unavailable</p>
                    </div>
                  )}
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-medium text-indigo-600 mb-1">Roovo Total</p>
                  <p className="text-lg font-bold text-slate-900">
                    ₹{currentRoovoTotal.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-indigo-400 mt-1">₹{Math.round(displayPricePerNight).toLocaleString()} / night</p>
                </div>
              </div>

              {/* Scraper Failure / Report Cheaper Price Button */}
              {(!loadingAirbnbPrice && (!airbnbAvailable || !compareAirbnbTotal)) && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  {!reportSuccess ? (
                    <>
                      {!showReportForm ? (
                        <button
                          onClick={() => setShowReportForm(true)}
                          className="w-full text-left flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">Found it cheaper elsewhere?</span>
                            <span className="text-[11px] text-slate-500">Report the URL and we'll beat it!</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg group-active:scale-95 transition-transform">Report URL</span>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-700">Paste the cheaper listing URL:</p>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={reportUrl}
                              onChange={(e) => setReportUrl(e.target.value)}
                              placeholder="https://airbnb.com/rooms/..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button
                              disabled={isSubmittingReport || !reportUrl}
                              onClick={async () => {
                                triggerHaptic();
                                setIsSubmittingReport(true);
                                try {
                                  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/leads/price-match`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId,
                                      userName,
                                      userPhone,
                                      listingId,
                                      listingTitle,
                                      cheaperUrl: reportUrl
                                    })
                                  });
                                  if (response.ok) {
                                    setReportSuccess(true);
                                  }
                                } catch (e) {
                                  console.error('Failed to report URL:', e);
                                } finally {
                                  setIsSubmittingReport(false);
                                }
                              }}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                            >
                              {isSubmittingReport ? '...' : 'Submit'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center py-2"
                    >
                      <p className="text-sm font-bold text-indigo-600">Thank you!</p>
                      <p className="text-[11px] text-slate-600 mt-1">We will get back to you with the best price.</p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Savings Highlight */}
              {savingsTotal > 0 && (
                <div className="bg-green-50/50 border border-green-100 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-700">Total Savings</p>
                    <p className="text-xs text-green-600/80">Roovo matches price at 10% lower</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-700">₹{savingsTotal.toLocaleString()}</p>
                    <p className="text-xs font-bold text-green-600 bg-green-200/50 px-2 py-0.5 rounded-md mt-1 italic">-{discountPercent}% OFF</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 font-medium text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base Price ({nights} nights)</span>
                  <span>₹{Math.round(currentRoovoBaseTotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Roovo Service Fee</span>
                  <span className={isFeeWaived ? "text-green-600" : ""}>
                    {isFeeWaived ? "₹0 (Waived!)" : `₹${Math.round(currentRoovoServiceFeeTotal).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes (GST)</span>
                  <div className="text-right">
                    <span>₹{Math.round(totalTax).toLocaleString()}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {roomGstRate * 100}% on Room
                      {!isFeeWaived && (
                        <span> • 18% on Service Fee</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between text-lg font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span>₹{Math.round(grandTotal).toLocaleString()}</span>
                </div>
              </div>

              <motion.button
                onClick={() => {
                  triggerHaptic();
                  setShowBreakdown(false);
                  onReserveClick();
                }}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
              >
                Reserve Now
              </motion.button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </motion.div >
  );
};

export default BookingBar;
