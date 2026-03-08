"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { getListingsWithBookingsByHostId, batchCreatePriceOverrides, fetchPriceOverrides } from "../../services/api";
import supabase from "../../services/api";
// import ListingCarousel from "./ListingCarousel"; // Removed as we are using internal Roller
import CalendarGrid from "./CalendarGrid";
import Toast from "../ui/toast";
import SmartPricingDrawer from "./SmartPricingDrawer";
import { Zap, X, Check } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import RoovoLoader from "../RoovoLoader";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  guest_id: string;
  guest?: { name: string; avatar_url: string | null };
  payment_method?: string;
}

interface PriceOverride {
  start_date: string;
  end_date: string;
  price_per_night: number;
}

interface Listing {
  id: string;
  title: string;
  price_per_night: number;
  weekend_price: number;
  primary_image_url: string;
  bookings?: Booking[];
  price_overrides?: PriceOverride[];
}

import { useNavigation } from "@/hooks/useNavigation";
import { useBottomNavBar } from "@/context/BottomNavBarContext";

const Calendar = () => {
  const { search } = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const { setIsNavBarVisible } = useBottomNavBar();

  // Roller State
  const [currentIndex, setCurrentIndex] = useState(0);

  // Smart Pricing State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [pricePlaceholder, setPricePlaceholder] = useState<string>("Price");

  // Property Switcher Modal State
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Booking Details Drawer State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [search]);


  // Sync selectedListing with currentIndex
  useEffect(() => {
    if (listings.length > 0) {
      setSelectedListing(listings[currentIndex]);
      setBookings(listings[currentIndex].bookings || []);
    }
  }, [currentIndex, listings]);

  // Hide Bottom Nav when dates are selected
  useEffect(() => {
    setIsNavBarVisible(selectedDates.length === 0);
    return () => setIsNavBarVisible(true);
  }, [selectedDates.length, setIsNavBarVisible]);


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const hostId = session.user.id;
        const data = await getListingsWithBookingsByHostId(hostId);
        setListings(data);
        if (data.length > 0) {
          // Check query param for deep linking
          const params = new URLSearchParams(search);
          const queryId = params.get('listingId');
          let initialIndex = 0;

          if (queryId) {
            const idx = data.findIndex((l: Listing) => l.id === queryId);
            if (idx !== -1) initialIndex = idx;
          }
          setCurrentIndex(initialIndex);
          setSelectedListing(data[initialIndex]);
          setBookings(data[initialIndex].bookings || []);
        } else {
          setToastMessage("Please complete the property from draft listing in the listings page");
          setShowToast(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setDirection(-1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    triggerHaptic();
  };

  const goToNextMonth = () => {
    setDirection(1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    triggerHaptic();
  };

  // --- Pricing Logic (Kept Same) ---
  const priceMap = useMemo(() => {
    if (!selectedListing) return {};
    const map: Record<string, number> = {};
    const { price_per_night, weekend_price, price_overrides } = selectedListing;

    const isWeekend = (date: Date) => {
      const day = date.getDay();
      return day === 5 || day === 6;
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      const dateStr = localDate.toISOString().split('T')[0];
      map[dateStr] = isWeekend(date) && weekend_price ? weekend_price : price_per_night;
    }

    if (price_overrides) {
      price_overrides.forEach(override => {
        const start = new Date(override.start_date);
        const end = new Date(override.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - (offset * 60 * 1000));
          const iso = localDate.toISOString().split('T')[0];
          if (map[iso] !== undefined) {
            map[iso] = override.price_per_night;
          }
        }
      });
    }

    return map;
  }, [selectedListing, currentDate]);

  // Calculate Price Range for Selection
  useEffect(() => {
    if (selectedDates.length === 0) {
      setBulkPrice("");
      setPricePlaceholder("Price");
      return;
    }

    const prices = selectedDates.map(d => priceMap[d]).filter(p => p !== undefined);
    if (prices.length === 0) return;

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) {
      setBulkPrice(min.toString());
      setPricePlaceholder("Price");
    } else {
      setBulkPrice("");
      setPricePlaceholder(`${min} - ${max}`);
    }
  }, [selectedDates, priceMap]);

  // --- Handlers ---

  const handleToggleDate = (date: string) => {
    setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    setBulkPrice("");
  };

  const handleRangeSelect = (dates: string[]) => {
    // Merge unique dates
    setSelectedDates(prev => {
      const newSet = new Set([...prev, ...dates]);
      return Array.from(newSet);
    });
    setBulkPrice("");
  };

  const handleBatchUpdate = async (overrides: PriceOverride[]) => {
    if (!selectedListing) return;
    setIsLoading(true);
    try {
      const payload = overrides.map(o => ({ ...o, listing_id: selectedListing.id }));
      await batchCreatePriceOverrides(payload);
      await triggerHaptic();
      const updatedOverrides = await fetchPriceOverrides(selectedListing.id);

      // Update local state without refetching all
      setListings(prev => prev.map(l =>
        l.id === selectedListing.id
          ? { ...l, price_overrides: updatedOverrides }
          : l
      ));

      setSelectedDates([]);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyHolidayPremium = (dates: string[], factor: number) => {
    if (!selectedListing) return;
    const basePrice = selectedListing.price_per_night;
    const newPrice = Math.round(basePrice * factor);
    const overrides = dates.map(date => ({
      start_date: date,
      end_date: date,
      price_per_night: newPrice
    }));
    handleBatchUpdate(overrides);
  };

  const handleApplyWeekendPremium = (percent: number) => {
    if (!selectedListing) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const overrides: PriceOverride[] = [];
    const newPrice = Math.round(selectedListing.price_per_night * (1 + percent / 100));

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const day = date.getDay();
      if (day === 5 || day === 6) {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        const iso = localDate.toISOString().split('T')[0];
        overrides.push({
          start_date: iso,
          end_date: iso,
          price_per_night: newPrice
        });
      }
    }
    handleBatchUpdate(overrides);
  };

  const handleBulkSave = () => {
    if (!selectedDates.length || !bulkPrice) return;
    const price = parseInt(bulkPrice);
    if (isNaN(price)) return;
    const overrides = selectedDates.map(date => ({
      start_date: date,
      end_date: date,
      price_per_night: price
    }));
    handleBatchUpdate(overrides);
  };

  // Roller Logic
  const handleRollerClick = async () => {
    // Maybe show hint? kept simple for now
    await triggerHaptic();
  };

  // Long Press Logic
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      triggerHaptic();
      setIsPropertiesModalOpen(true);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDragStart = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePropertySelect = (index: number) => {
    setCurrentIndex(index);
    setIsPropertiesModalOpen(false);
    triggerHaptic();
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsBookingDrawerOpen(true);
    triggerHaptic();
  };

  if (!selectedListing && !isLoading && listings.length > 0) return null; // Wait for sync

  return (
    <div className="min-h-screen bg-gray-50/50 text-slate-900 font-sans pb-48">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      {isLoading && listings.length === 0 ? (
        <div className="flex justify-center items-center h-[60vh]">
          <RoovoLoader className="w-20 h-auto" />
        </div>
      ) : listings.length > 0 ? (
        <>
          {/* --- Header / Property Card (ROLLER) --- */}
          <div className="pt-4 pb-2 px-4 relative flex flex-col gap-3">
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { triggerHaptic(); setIsDrawerOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 text-white rounded-full shadow-sm active:scale-95 transition-all text-xs font-bold"
              >
                <Zap size={14} fill="currentColor" />
                Smart Pricing
              </button>
            </div>

            <div
              className="relative h-24 w-full"
              onClick={handleRollerClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
            >
              <AnimatePresence mode="wait">
                {selectedListing && (
                  <motion.div
                    key={selectedListing.id}
                    initial={{ y: 20, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    onDragStart={handleDragStart}
                    onDragEnd={(_, { offset }: PanInfo) => {
                      if (offset.y < -40) {
                        setCurrentIndex(prev => (prev + 1) % listings.length);
                        triggerHaptic();
                      } else if (offset.y > 40) {
                        setCurrentIndex(prev => (prev - 1 + listings.length) % listings.length);
                        triggerHaptic();
                      }
                    }}
                    className="bg-white rounded-2xl p-3 shadow-none border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform select-none cursor-grab active:cursor-grabbing"
                  >
                    <div className="relative group">
                      <img
                        src={selectedListing.primary_image_url}
                        alt={selectedListing.title}
                        className="w-16 h-16 object-cover rounded-xl shadow-sm ring-1 ring-black/5"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white font-bold">
                        {listings.length}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-20">
                      <h3 className="text-base font-bold text-slate-900 truncate leading-tight">
                        {selectedListing.title}
                      </h3>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        {/* MapPin icon removed to save imports, or add if needed */}
                        <span className="truncate">Base: ₹{selectedListing.price_per_night}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Hold to view all</p>
                    </div>

                    {/* VIsual Cue */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center justify-center w-6 opacity-20 pointer-events-none">
                      <div className="w-1 h-1 rounded-full bg-slate-900" />
                      <div className="w-1 h-1 rounded-full bg-slate-900" />
                      <div className="w-1 h-1 rounded-full bg-slate-900" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* --- Calendar Controls --- */}
          <div className="px-4 py-4 flex justify-between items-center bg-transparent">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {currentDate.toLocaleString("default", { month: "long" })}
              <span className="text-gray-400 text-lg font-medium ml-2">{currentDate.getFullYear()}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={goToPreviousMonth} className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
                <span className="text-lg font-bold leading-none pb-0.5">&#10094;</span>
              </button>
              <button onClick={goToNextMonth} className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
                <span className="text-lg font-bold leading-none pb-0.5">&#10095;</span>
              </button>
            </div>
          </div>

          {/* --- Calendar Grid --- */}
          <CalendarGrid
            currentDate={currentDate}
            bookings={bookings}
            isLoading={isLoading}
            direction={direction}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            priceMap={priceMap}
            selectedDates={selectedDates}
            onToggleDate={handleToggleDate}
            onRangeSelect={handleRangeSelect}
            onBookingClick={handleBookingClick}
          />

          {/* Bulk Edit Bar (Glass) */}
          <div className={`fixed bottom-24 left-4 right-4 z-40 transition-all duration-500 ease-spring ${selectedDates.length > 0 ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}`}>
            <div className="bg-white/95 backdrop-blur-xl border border-white/50 p-4 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex items-center justify-between gap-4 ring-1 ring-black/5">

              <div className="flex flex-col min-w-0">
                {pricePlaceholder !== "Price" && (
                  <div className="text-[11px] font-medium text-slate-400 mt-1 truncate">
                    Range: <span className="text-slate-600 font-semibold">₹{pricePlaceholder}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 relative group max-w-[200px]">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold group-focus-within:text-indigo-600 transition-colors">₹</span>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  className="w-full bg-transparent border-none p-0 pl-6 font-black text-slate-800 text-2xl outline-none placeholder:text-slate-200"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedDates([])}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
                >
                  <X size={22} strokeWidth={3} />
                </button>
                <button
                  onClick={handleBulkSave}
                  disabled={!bulkPrice}
                  className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20 hover:shadow-slate-900/40 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:bg-slate-200"
                >
                  {isLoading ? <RoovoLoader className="w-5 h-5" color="white" /> : <Check size={22} strokeWidth={4} />}
                </button>
              </div>
            </div>
          </div>

          <SmartPricingDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onApplyHolidayPremium={handleApplyHolidayPremium}
            onApplyWeekendPremium={handleApplyWeekendPremium}
          />

          {/* Booking Details Drawer */}
          <AnimatePresence>
            {isBookingDrawerOpen && selectedBooking && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  onClick={() => setIsBookingDrawerOpen(false)}
                />

                {/* Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] overflow-hidden max-h-[80vh] flex flex-col"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-gray-900 ml-2">Booking Details</h3>
                    <button
                      onClick={() => setIsBookingDrawerOpen(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto pb-safe-bottom">
                    <div className="space-y-4">
                      {/* Distinguish internal vs external */}
                      {(selectedBooking.status === 'blocked' || selectedBooking.payment_method === 'external') ? (
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-4 ring-1 ring-amber-200/50">
                          <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-amber-200">
                            <span className="text-xl">📅</span>
                          </div>
                          <div>
                            <h4 className="text-amber-900 font-bold text-lg leading-tight">Booked Externally</h4>
                            <p className="text-amber-700 text-sm mt-1">This date is blocked by an external calendar sync (e.g. Airbnb, MakeMyTrip).</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center gap-4 ring-1 ring-indigo-200/50">
                          <div className="w-12 h-12 rounded-full bg-indigo-200 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                            {selectedBooking.guest?.avatar_url ? (
                              <img src={selectedBooking.guest.avatar_url} alt="Guest" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-indigo-600 font-bold text-lg">{selectedBooking.guest?.name?.charAt(0) || 'G'}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-indigo-900 font-bold text-lg leading-tight">{selectedBooking.guest?.name || 'Guest'}</h4>
                            <p className="text-indigo-700 text-sm mt-0.5 capitalize font-medium">Status: {selectedBooking.status.replace('_', ' ')}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center py-3 border-b border-slate-200/60 last:border-0">
                          <span className="text-slate-500 text-sm font-medium">Check-in Date</span>
                          <span className="text-slate-900 font-bold">{new Date(selectedBooking.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-200/60 last:border-0">
                          <span className="text-slate-500 text-sm font-medium">Check-out Date</span>
                          <span className="text-slate-900 font-bold">{new Date(selectedBooking.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-200/60 last:border-0">
                          <span className="text-slate-500 text-sm font-medium">Nights</span>
                          <span className="text-slate-900 font-bold">
                            {Math.ceil((new Date(selectedBooking.end_date).getTime() - new Date(selectedBooking.start_date).getTime()) / (1000 * 3600 * 24))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Property Selection Modal */}
          <AnimatePresence>
            {isPropertiesModalOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  onClick={() => setIsPropertiesModalOpen(false)}
                />

                {/* Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] overflow-hidden max-h-[80vh] flex flex-col"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-gray-900 ml-2">All Properties ({listings.length})</h3>
                    <button
                      onClick={() => setIsPropertiesModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto pb-safe-bottom">
                    <div className="grid grid-cols-1 gap-3">
                      {listings.map((listing, index) => (
                        <div
                          key={listing.id}
                          onClick={() => handlePropertySelect(index)}
                          className={`flex items-center gap-4 p-3 rounded-2xl border transition-all active:scale-[0.98] ${currentIndex === index
                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                            : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                          <div className="relative w-16 h-16 shrink-0">
                            <img
                              src={listing.primary_image_url}
                              alt={listing.title}
                              className="w-full h-full object-cover rounded-xl bg-gray-100"
                            />
                            {currentIndex === index && (
                              <div className="absolute inset-0 bg-indigo-900/10 rounded-xl flex items-center justify-center">
                                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                                  <Check size={14} strokeWidth={3} />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-base font-bold leading-tight mb-1 ${currentIndex === index ? 'text-indigo-900' : 'text-gray-900'}`}>{listing.title}</h4>
                            <p className="text-xs text-gray-500">Base Price: ₹{listing.price_per_night}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
            <Check size={32} className="text-slate-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Listings Found</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Complete your draft listings to start managing availability.</p>
          </div>
          <button
            onClick={() => setShowToast(true)}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
          >
            Check Status
          </button>
        </div>
      )}
    </div>
  );
};

export default Calendar;
