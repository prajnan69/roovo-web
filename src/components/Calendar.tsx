"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  MessageSquare,
  MapPin,
  TrendingUp
} from "lucide-react";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";
import { useNavigation } from "@/hooks/useNavigation";
import {
  API_BASE_URL,
  getListingsWithBookingsByHostId,
  default as supabase,
} from "@/services/api";
import RoovoLoader from "./RoovoLoader";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import WheelPicker from "@/components/wheel-picker";
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import SlideToReserve from "./SlideToReserve";
import Toast from "./ui/toast";

// --- Types (Kept same) ---
interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  guest_id: string;
}

interface PriceOverride {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  weekend_price: number;
}

interface Listing {
  id: string;
  title: string;
  price_per_night: number;
  weekend_price: number;
  primary_image_url: string;
  bookings: Booking[];
  price_overrides: PriceOverride[];
}

interface CalendarProps {
  conversations: any[];
  onConversationSelect: (conversation: any) => void;
}

const Calendar: React.FC<CalendarProps> = ({ conversations, onConversationSelect }) => {
  // --- State (Kept same) ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const selectedListing = listings.length > 0 ? listings[currentIndex] : null;
  const [price, setPrice] = useState(0);
  const [basePricePercentage, setBasePricePercentage] = useState(5);
  const [weekendPercentage, setWeekendPercentage] = useState(20);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(false);
  const [isWeekendDrawerOpen, setIsWeekendDrawerOpen] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [untilDate, setUntilDate] = useState<string>(new Date().toISOString());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const { navigate } = useNavigation();

  // --- Handlers & Effects (Kept same logic) ---
  const handleTextGuest = () => {
    if (selectedBooking) {
      const conversation = conversations.find((c: any) => c.guest_id === selectedBooking.guest_id || c.host_id === selectedBooking.guest_id);
      if (conversation) {
        onConversationSelect(conversation);
        navigate(`/hosting/messages`);
      } else {
        console.error("Conversation not found");
      }
    }
  };

  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      value: date.toISOString(),
    };
  });

  const handlePriceEditorOpenChange = (open: boolean) => {
    setIsPriceEditorOpen(open);
    if (open) triggerHaptic();
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const hostId = session.user.id;
          const listingsData = await getListingsWithBookingsByHostId(hostId);
          setListings(listingsData);
        }
      } catch (e) {
        console.error("Failed to fetch:", e);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedListing) return;
    setBookings(selectedListing.bookings);
    const base = Number(selectedListing.price_per_night) || 0;
    const weekend = Number(selectedListing.weekend_price) || 0;
    setPrice(base);
    setBasePricePercentage(5);
    if (weekend > 0 && base > 0) {
      setWeekendPercentage(Math.round(((weekend - base) / base) * 100));
    } else {
      setWeekendPercentage(20);
    }

    const fetchGuestNames = async () => {
      if (selectedListing.bookings.length > 0) {
        const guestIds = [...new Set(selectedListing.bookings.map((b: { guest_id: any; }) => b.guest_id))];
        const res = await fetch(`${API_BASE_URL}/api/users/by-ids`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: guestIds }),
        });
        const { data: users } = await res.json();
        const names = users.reduce((a: any, u: any) => {
          a[u.id] = u.name;
          return a;
        }, {});
        setGuestNames(names);
      }
    };
    fetchGuestNames();
  }, [selectedListing, listings]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const goToPrev = () => {
    setDirection(-1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    triggerHaptic();
  };
  const goToNext = () => {
    setDirection(1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    triggerHaptic();
  };

  const variants: any = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "circOut" } },
    exit: (d: number) => ({ x: d < 0 ? "100%" : "-100%", opacity: 0, transition: { duration: 0.3, ease: "circIn" } }),
  };

  const newBasePrice = price * (1 + basePricePercentage / 100);
  const weekendPrice = newBasePrice * (1 + weekendPercentage / 100);

  const handleSave = async (): Promise<boolean> => {
    if (!selectedListing) return false;
    setIsSaving(true);
    setSaveSuccess(false);

    const roundedNewBasePrice = Math.round(newBasePrice / 10) * 10;
    const roundedWeekendPrice = Math.round(weekendPrice / 10) * 10;

    const payload = {
      listing_id: selectedListing.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: untilDate.split('T')[0],
      price_per_night: roundedNewBasePrice,
      weekend_price: roundedWeekendPrice,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/price-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newOverride = await res.json();
        setSaveSuccess(true);
        setListings(prev => prev.map(l => l.id === selectedListing!.id ? { ...l, price_overrides: [...l.price_overrides, newOverride] } : l));
        setTimeout(() => {
          setSaveSuccess(false);
          setIsWeekendDrawerOpen(false);
          setIsPriceEditorOpen(false);
        }, 2000);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollerClick = async () => {
    if (listings.length > 1) {
      setShowSwipeHint(true);
      setTimeout(() => setShowSwipeHint(false), 2500);
    }
  };

  useEffect(() => {
    if (!isInitialLoading && listings.length === 0) {
      setToastMessage("Please complete the property from draft listing in the listings page");
      setShowToast(true);
    }
  }, [isInitialLoading, listings]);

  if (isInitialLoading) return <div className="flex items-center justify-center h-screen"><RoovoLoader /></div>;

  if (listings.length === 0) {
    return <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-slate-900 font-sans pb-48">

      {/* --- Header / Property Card --- */}
      <div className="pt-4 pb-2 px-4">
        <div className="relative h-24 w-full" onClick={handleRollerClick}>
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
                onDragEnd={(e, { offset }) => {
                  if (offset.y < -40) {
                    setCurrentIndex(prev => (prev + 1) % listings.length);
                    triggerHaptic();
                  } else if (offset.y > 40) {
                    setCurrentIndex(prev => (prev - 1 + listings.length) % listings.length);
                    triggerHaptic();
                  }
                }}
                className="bg-white rounded-2xl p-3 shadow-none border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
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
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate leading-tight">
                    {selectedListing.title}
                  </h3>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">Base: ₹{selectedListing.price_per_night}</span>
                  </div>
                </div>

                {/* Visual Cue for Swiping */}
                <div className="flex flex-col gap-0.5 items-center justify-center w-6 opacity-20">
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
      <div className="px-4 py-4 flex justify-between items-center bg-gray-50/50">
        <div className="text-2xl font-bold text-gray-900 tracking-tight">
          {currentDate.toLocaleString("default", { month: "long" })}
          <span className="text-gray-400 text-lg font-medium ml-2">{currentDate.getFullYear()}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={goToPrev} className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
            <span className="text-lg font-bold leading-none pb-0.5">&#10094;</span>
          </button>
          <button onClick={goToNext} className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
            <span className="text-lg font-bold leading-none pb-0.5">&#10095;</span>
          </button>
        </div>
      </div>

      {/* --- Calendar Grid --- */}
      <div className="px-3 pb-20 overflow-hidden">
        <div className="grid grid-cols-7 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentDate.toString()}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid grid-cols-7 gap-2"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000) goToNext();
              else if (swipe > 10000) goToPrev();
            }}
          >
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}

            {isBookingsLoading ? (
              <div className="col-span-7 flex justify-center py-12"><Spinner /></div>
            ) : (
              Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

                const booking = bookings.find(b => {
                  return dateStr >= b.start_date && dateStr < b.end_date;
                });

                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const originalPrice = isWeekend ? Number(selectedListing?.weekend_price || 0) : Number(selectedListing?.price_per_night || 0);

                const override = selectedListing?.price_overrides.find(o => {
                  return dateStr >= o.start_date && dateStr <= o.end_date;
                });

                const dayPrice = override ? (isWeekend ? override.weekend_price : override.price_per_night) : originalPrice;

                // Determine Styling
                const isToday = new Date().setHours(0, 0, 0, 0) === date.setHours(0, 0, 0, 0);
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                let bgClass = "bg-white border border-slate-100";
                let textClass = "text-slate-700";

                if (booking) {
                  if (booking.status === "confirmed") {
                    bgClass = "bg-rose-50 border border-rose-100";
                    textClass = "text-rose-700";
                  } else if (booking.status === "pending") {
                    bgClass = "bg-amber-50 border border-amber-100";
                    textClass = "text-amber-700";
                  } else {
                    bgClass = "bg-slate-100 border border-slate-200";
                    textClass = "text-slate-500";
                  }
                } else if (isPast) {
                  bgClass = "bg-gray-50 border border-gray-50 opacity-60";
                  textClass = "text-gray-400";
                }

                // Override Indicator Color
                const priceColor = override
                  ? Number(dayPrice) > Number(originalPrice) ? "text-emerald-600" : "text-rose-600"
                  : "text-slate-400";

                return (
                  <motion.div
                    key={d}
                    className={`relative flex flex-col justify-between p-1.5 rounded-xl h-24 shadow-sm ${bgClass} ${isToday ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (booking) {
                        setSelectedBooking(booking);
                        setIsBookingDetailsOpen(true);
                      } else {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date >= today) {
                          setIsPriceEditorOpen(true);
                        } else {
                          setToastMessage("Cannot edit past dates");
                          setShowToast(true);
                          triggerErrorHaptic();
                          setTimeout(() => setShowToast(false), 2000);
                        }
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-bold ${isToday ? "text-indigo-600" : textClass}`}>
                        {d}
                      </span>
                      {override && (
                        <div className={`w-1.5 h-1.5 rounded-full ${Number(dayPrice) > Number(originalPrice) ? "bg-emerald-500" : "bg-rose-500"}`} />
                      )}
                    </div>

                    {booking ? (
                      <div className="mt-1">
                        <div className={`text-[9px] font-semibold leading-tight truncate px-1 py-0.5 rounded-md w-full ${booking.status === 'confirmed' ? 'bg-rose-100/50' : 'bg-amber-100/50'}`}>
                          {guestNames[booking.guest_id]?.split(' ')[0] || "Guest"}
                        </div>
                      </div>
                    ) : (
                      !isPast && (
                        <div className={`text-[9px] font-medium text-right self-end mt-auto ${priceColor}`}>
                          ₹{(dayPrice / 1000).toFixed(1)}k
                        </div>
                      )
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* --- Drawers (Modernized) --- */}

      {/* 1. Base Price Editor */}
      <Drawer open={isPriceEditorOpen} onOpenChange={handlePriceEditorOpenChange}>
        <DrawerContent className="bg-white rounded-t-[32px]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-4" />
          <DrawerHeader className="px-6">
            <DrawerTitle className="text-2xl font-bold text-slate-900">Edit Pricing</DrawerTitle>
            <DrawerDescription className="text-slate-500">
              Adjust base rates for the selected range.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-8">
            {/* Percentage Slider */}
            <div className="bg-slate-50 rounded-2xl p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Price Adjustment
                </span>
                <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full text-sm">
                  {basePricePercentage > 0 ? '+' : ''}{basePricePercentage}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={basePricePercentage}
                onChange={e => { setBasePricePercentage(Number(e.target.value)); triggerHaptic(); }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="mt-4 text-center">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">
                  <SlidingNumber number={newBasePrice.toFixed(0)} />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-1">New Base Price</p>
              </div>
            </div>

            {/* Date Wheel Picker */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 block">Apply Until</label>
              <div className="h-32 rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50 relative">
                <WheelPicker
                  data={dateOptions.map(d => d.label)}
                  onChange={(label) => {
                    const opt = dateOptions.find(o => o.label === label);
                    if (opt) setUntilDate(opt.value);
                  }}
                  initialValue={dateOptions.find(o => o.value === untilDate)?.label}
                />
                {/* Gradient overlays for 3D feel */}
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
              </div>
            </div>

            <Button onClick={() => setIsWeekendDrawerOpen(true)} className="w-full h-14 text-lg rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-200">
              Continue
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 2. Weekend Editor */}
      <Drawer open={isWeekendDrawerOpen} onOpenChange={setIsWeekendDrawerOpen}>
        <DrawerContent className="bg-white rounded-t-[32px]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-4" />
          <DrawerHeader className="px-6">
            <DrawerTitle className="text-xl font-bold text-slate-900">Weekend Premium</DrawerTitle>
            <DrawerDescription>Extra charge for Fri/Sat/Sun nights.</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-8">
            <div className="bg-indigo-50 rounded-2xl p-5 mb-6 border border-indigo-100">
              <div className="flex justify-between mb-4">
                <span className="text-sm font-semibold text-indigo-900">Markup</span>
                <span className="font-bold text-indigo-600">{weekendPercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weekendPercentage}
                onChange={e => { setWeekendPercentage(Number(e.target.value)); triggerHaptic(); }}
                className="w-full h-2 bg-white/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between items-end mt-4 border-t border-indigo-200/50 pt-4">
                <div className="text-indigo-400 text-xs font-medium">
                  Base: ₹{newBasePrice.toFixed(0)}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-indigo-700">
                    ₹<SlidingNumber number={weekendPrice.toFixed(0)} />
                  </div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase">Weekend Price</div>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <SlideToReserve onSlide={handleSave} variant="confirm" />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 3. Booking Details */}
      <Drawer open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
        <DrawerContent className="bg-white rounded-t-[32px]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-4" />
          <DrawerHeader className="px-6 text-left">
            <DrawerTitle className="text-2xl font-bold text-slate-900">Booking Details</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-8">
            {selectedBooking && (
              <div className="space-y-4">
                {/* Guest Card */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="bg-white p-3 rounded-full shadow-sm text-slate-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Guest</p>
                    <p className="text-lg font-bold text-slate-800">{guestNames[selectedBooking.guest_id] || "Guest Name"}</p>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${selectedBooking.status === 'confirmed' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    {selectedBooking.status === 'confirmed' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <div>
                      <p className="text-[10px] opacity-70 font-bold uppercase">Status</p>
                      <p className="font-bold capitalize">{selectedBooking.status}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2 text-slate-700">
                    <CalendarIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Nights</p>
                      <p className="font-bold">
                        {Math.ceil((new Date(selectedBooking.end_date).getTime() - new Date(selectedBooking.start_date).getTime()) / (1000 * 3600 * 24))} Nights
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Check-in</p>
                    <p className="font-bold text-slate-800">{new Date(selectedBooking.start_date).getDate()}</p>
                    <p className="text-xs text-slate-500 uppercase">{new Date(selectedBooking.start_date).toLocaleString('default', { month: 'short' })}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Check-out</p>
                    <p className="font-bold text-slate-800">{new Date(selectedBooking.end_date).getDate()}</p>
                    <p className="text-xs text-slate-500 uppercase">{new Date(selectedBooking.end_date).toLocaleString('default', { month: 'short' })}</p>
                  </div>
                </div>

                <Button onClick={handleTextGuest} className="w-full h-14 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200 mt-2">
                  <MessageSquare className="w-4 h-4" />
                  Message Guest
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default Calendar;
