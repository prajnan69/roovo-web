"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import dayjs from "dayjs";
import SlidingText from "./SlidingText";

export const transition = { type: "spring", stiffness: 300, damping: 30 } as const;

// --- Mock Data ---
const destinations = [
  { name: "Bengaluru", img: "/bengaluru.png" },
  { name: "Mumbai", img: "/mumbai.png" },
  { name: "Pondicherry", img: "/pondicherry.png" },
  { name: "Goa", img: "/goa.png" },
  { name: "Chennai", img: "/chennai.png" },
];

// --- Animation Variants (for staggering) ---
const dropdownVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

interface ModernSearchBarProps {
  showSlidingText?: boolean;
  isCollapsed: boolean;
  onExpand: () => void;
  selectedCity: { name: string; img: string; };
  setSelectedCity: React.Dispatch<React.SetStateAction<{ name: string; img: string; }>>;
  dates: { checkIn: Date | null; checkOut: Date | null };
  setDates: React.Dispatch<React.SetStateAction<{ checkIn: Date | null; checkOut: Date | null }>>;
  adults: number;
  setAdults: React.Dispatch<React.SetStateAction<number>>;
  childrenState: number;
  setChildrenState: React.Dispatch<React.SetStateAction<number>>;
  infants: number;
  setInfants: React.Dispatch<React.SetStateAction<number>>;
  pets: number;
  setPets: React.Dispatch<React.SetStateAction<number>>;
}

// --- Main Component ---
const ModernSearchBar: React.FC<ModernSearchBarProps> = ({
  showSlidingText = true,
  isCollapsed,
  onExpand,
  selectedCity,
  setSelectedCity,
  dates,
  setDates,
  adults,
  setAdults,
  childrenState,
  setChildrenState,
  infants,
  setInfants,
  pets,
  setPets,
}) => {
  const [activeSection, setActiveSection] = useState<"where" | "when" | "who" | null>(null);
  const [hoveredCity, setHoveredCity] = useState<typeof destinations[0] | null>(null);

  const whereRef = useRef<HTMLDivElement>(null);
  const whenRef = useRef<HTMLDivElement>(null);
  const whoRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const whereDropdownRef = useRef<HTMLDivElement>(null);
  const whenDropdownRef = useRef<HTMLDivElement>(null);
  const whoDropdownRef = useRef<HTMLDivElement>(null);

  const [highlightStyle, setHighlightStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const prefersReducedMotion = useReducedMotion();

  // --- Effects ---

  // Effect for scrolling to the bottom of the calendar when dates are selected
  useEffect(() => {
    if (dates.checkIn && dates.checkOut && whenDropdownRef.current) {
      const timer = setTimeout(() => {
        whenDropdownRef.current?.scrollTo({
          top: whenDropdownRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100); // A small delay to ensure the UI has updated
      return () => clearTimeout(timer);
    }
  }, [dates.checkIn, dates.checkOut]);

  // Effect for the sliding highlight animation
  useEffect(() => {
    const updateHighlight = () => {
      let ref;
      if (activeSection === "where") ref = whereRef.current;
      else if (activeSection === "when") ref = whenRef.current;
      else if (activeSection === "who") ref = whoRef.current;
      else { setHighlightStyle((prev) => ({ ...prev, width: 0 })); return; }
      
      const container = containerRef.current;
      if (ref && container) {
        const refRect = ref.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setHighlightStyle({ left: refRect.left - containerRect.left, width: refRect.width });
      }
    };

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    const timeoutId = setTimeout(updateHighlight, 50);
    return () => { window.removeEventListener("resize", updateHighlight); clearTimeout(timeoutId); };
  }, [activeSection]);

  // Effect for handling clicks outside to collapse dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(event.target as Node)) return;

      let dropdownRef = null;
      if (activeSection === "where") dropdownRef = whereDropdownRef.current;
      else if (activeSection === "when") dropdownRef = whenDropdownRef.current;
      else if (activeSection === "who") dropdownRef = whoDropdownRef.current;

      if (dropdownRef && dropdownRef.contains(event.target as Node)) return;

      setActiveSection(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeSection, containerRef, whereDropdownRef, whenDropdownRef, whoDropdownRef]);

  // --- Handlers & Logic ---

  const isInRange = (date: dayjs.Dayjs) => {
    if (!dates.checkIn || !dates.checkOut) return false;
    return date.isAfter(dayjs(dates.checkIn)) && date.isBefore(dayjs(dates.checkOut));
  };

  const handleDateClick = (date: dayjs.Dayjs) => {
    const selectedDate = date.toDate();
    if (!dates.checkIn || (dates.checkIn && dates.checkOut)) {
      setDates({ checkIn: selectedDate, checkOut: null });
    } else {
      if (dayjs(selectedDate).isBefore(dates.checkIn, 'day')) {
        setDates({ checkIn: selectedDate, checkOut: dates.checkIn });
      } else {
        setDates({ ...dates, checkOut: selectedDate });
      }
    }
  };

  const handleClearDates = () => {
    setDates({ checkIn: null, checkOut: null });
  };

  const handleQuickDateSelection = (period: "weekend" | "nextWeek" | "month") => {
    let newCheckIn: Date | null = null;
    let newCheckOut: Date | null = null;
    const today = dayjs();

    if (period === "weekend") {
      let friday = dayjs().day(5); // Friday of current week
      if (friday.isBefore(today, 'day')) { // If Friday has passed, get next week's Friday
        friday = friday.add(7, 'day');
      }
      const sunday = friday.add(2, 'day'); // Sunday is 2 days after Friday
      newCheckIn = friday.toDate();
      newCheckOut = sunday.toDate();
    } else if (period === "nextWeek") {
      const nextMonday = today.add(1, 'week').startOf('week').day(1);
      const nextSunday = today.add(1, 'week').endOf('week').day(0);
      newCheckIn = nextMonday.toDate();
      newCheckOut = nextSunday.toDate();
    } else if (period === "month") {
      newCheckIn = today.toDate();
      newCheckOut = today.add(1, 'month').toDate();
    }
    setDates({ checkIn: newCheckIn, checkOut: newCheckOut });
  };

  const totalNights = dates.checkIn && dates.checkOut ? dayjs(dates.checkOut).diff(dayjs(dates.checkIn), "day") : 0;

  const totalGuests = adults + childrenState;
  const guestSummary = totalGuests > 0
    ? `${totalGuests} guest${totalGuests > 1 ? "s" : ""}${pets > 0 ? `, ${pets} pet${pets > 1 ? "s" : ""}` : ""}`
    : "Who's joining?";
  
  const isSearchReady = dates.checkIn && dates.checkOut && (adults + childrenState > 0);

  // --- Render ---

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed bottom-0 left-0 right-0 bg-white p-4 z-50"
    >
      {isCollapsed ? (
        <motion.div
          key="collapsed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="w-full max-w-md mx-auto"
        >
          <button
            onClick={onExpand}
            className="w-full border border-slate-200/70 rounded-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 min-w-[280px]"
          >
            <SlidingText animate={showSlidingText} />
            <span className="bg-indigo-500 text-white rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            </span>
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="relative w-full max-w-5xl mx-auto" style={{ zIndex: 100 }}
        >
          <div ref={containerRef} className="relative bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-full  flex items-center overflow-hidden px-2 py-0 gap-1">
            <motion.div className="absolute top-1 bottom-1 bg-slate-100 rounded-full " animate={highlightStyle} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeInOut" }} />
            
          <div ref={whereRef} className="flex-1 px-5 py-2 rounded-full cursor-pointer transition-all duration-300 relative z-10" onClick={() => setActiveSection("where")}>
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <p className="text-xs font-semibold text-slate-500">📍 Where</p>
                <p className="text-sm font-bold text-slate-900">{selectedCity.name || "Where to next?"}</p>
              </motion.div>
            </div>
            <div className="border-l h-8 border-slate-200/30"></div>
            <div ref={whenRef} className="flex-1 px-5 py-2 rounded-full cursor-pointer transition-all duration-300 relative z-10" onClick={() => setActiveSection("when")}>
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <p className="text-xs font-semibold text-slate-500">📅 When</p>
                <p className={`text-sm font-bold ${dates.checkIn ? 'text-slate-900' : 'text-slate-500'}`}>{dates.checkIn ? `${dayjs(dates.checkIn).format("DD MMM")} - ${dates.checkOut ? dayjs(dates.checkOut).format("DD MMM") : 'Check-out?'}` : "Select dates"}</p>
              </motion.div>
            </div>
            <div className="border-l h-8 border-slate-200/30"></div>
            <div ref={whoRef} className="flex-1 px-5 py-2 rounded-full cursor-pointer transition-all duration-300 relative z-10" onClick={() => setActiveSection("who")}>
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <p className="text-xs font-semibold text-slate-500">🫂 Who</p>
                <p className="text-sm font-bold text-slate-900">{guestSummary === "Who's joining?" ? "Who's joining?" : guestSummary}</p>
              </motion.div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
              className="ml-3 bg-indigo-500 rounded-full p-3 text-white shadow-lg z-10 flex items-center justify-center gap-2 cursor-pointer"
              animate={{
                scale: 1,
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              }}
              transition={{}}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
              <span className="text-sm font-semibold">Search</span>
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {activeSection === "where" && (
              <motion.div
            key="where"
            ref={whereDropdownRef}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={prefersReducedMotion ? { duration: 0 } : {}}
            className="absolute top-16 left-0 w-full flex gap-6 p-4 bg-slate-50 rounded-3xl shadow-xl shadow-slate-400/10 border border-slate-200/80"
          >
            <div className="flex-1">
              <motion.h3 variants={itemVariants} className="text-lg font-bold text-slate-800 mb-4">Let&apos;s find your next vibe ✨</motion.h3>
              <div className="grid grid-cols-3 gap-4">
                {destinations.map((city) => (
                  <motion.div
                    variants={itemVariants}
                    key={city.name}
                    onMouseEnter={() => setHoveredCity(city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => { setSelectedCity(city); setActiveSection("when"); handleClearDates(); }}
                    whileHover={{ scale: prefersReducedMotion ? 1 : 1.05 }}
                    whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
                    className={`cursor-pointer p-4 rounded-2xl relative transition-colors duration-200 font-semibold text-center ${selectedCity.name === city.name ? "text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}
                  >
                    {selectedCity.name === city.name && <motion.div layoutId="selected-city-pill" className="absolute inset-0 bg-indigo-600 rounded-2xl z-0" transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: "easeInOut" }} />}
                    <span className="relative z-10">{city.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <motion.div variants={itemVariants} className="flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={hoveredCity ? hoveredCity.name : selectedCity.name} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}>
                  <img src={hoveredCity ? hoveredCity.img : selectedCity.img} alt={hoveredCity ? hoveredCity.name : selectedCity.name} width={500} height={400} className="w-full h-64 object-contain rounded-xl" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {activeSection === "when" && (
          <motion.div
            key="when-redesigned"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeInOut" }}
            className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-3xl"
          >
            <div ref={whenDropdownRef} className="bg-slate-50 rounded-3xl p-6 shadow-xl shadow-slate-400/10 border border-slate-200/80 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800 text-center">Select your dates</h3>
                <p className="text-sm text-slate-500 text-center mb-4">Your adventure in {selectedCity.name} awaits.</p>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => handleQuickDateSelection("weekend")} className="text-sm font-semibold bg-slate-200/80 px-3 py-1 rounded-full text-slate-800 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">This weekend</button>
                  <button onClick={() => handleQuickDateSelection("nextWeek")} className="text-sm font-semibold bg-slate-200/80 px-3 py-1 rounded-full text-slate-800 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">Next week</button>
                  <button onClick={() => handleQuickDateSelection("month")} className="text-sm font-semibold bg-slate-200/80 px-3 py-1 rounded-full text-slate-800 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">A month</button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))} className="p-2 rounded-full hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></motion.button>
                <div className="flex-1 grid grid-cols-2 gap-8 text-center"><h4 className="text-lg font-bold text-slate-900">{currentMonth.format("MMMM YYYY")}</h4><h4 className="text-lg font-bold text-slate-900">{currentMonth.add(1, "month").format("MMMM YYYY")}</h4></div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setCurrentMonth(currentMonth.add(1, "month"))} className="p-2 rounded-full hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></motion.button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="grid grid-cols-7 text-center text-sm font-semibold text-slate-700 mb-2">{["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (<div key={`day-left-${i}`}>{day}</div>))}</div>
                  <div className="grid grid-cols-7 gap-1">{Array(currentMonth.startOf('month').day()).fill(null).map((_, idx) => <div key={`empty-left-${idx}`} />)}{Array(currentMonth.daysInMonth()).fill(0).map((_, idx) => {const day = idx + 1; const date = currentMonth.date(day); const isPastDate = date.isBefore(dayjs(), 'day'); const inRange = isInRange(date); const isCheckIn = dates.checkIn && date.isSame(dates.checkIn, "day"); const isCheckOut = dates.checkOut && date.isSame(dates.checkOut, "day"); const isTodayDate = date.isSame(dayjs(), 'day');
                    return (<motion.div key={`left-${day}`} onClick={() => !isPastDate && handleDateClick(date)} whileHover={{ scale: isPastDate || prefersReducedMotion ? 1 : 1.1 }} whileTap={{ scale: isPastDate || prefersReducedMotion ? 1 : 0.95 }} className={`h-10 flex items-center justify-center rounded-full transition-all duration-200 font-semibold relative z-10 ${isPastDate ? "text-slate-400 cursor-not-allowed" : isCheckIn || isCheckOut ? "bg-indigo-600 text-white shadow-md cursor-pointer" : inRange ? "bg-indigo-100 text-indigo-700 cursor-pointer" : isTodayDate ? "border-2 border-indigo-400 text-slate-900 hover:bg-slate-100 cursor-pointer" : "hover:bg-slate-100 text-slate-900 cursor-pointer"}`}>{day}</motion.div>);})}
                  </div>
                </div>
                <div>
                  <div className="grid grid-cols-7 text-center text-sm font-semibold text-slate-700 mb-2">{["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (<div key={`day-right-${i}`}>{day}</div>))}</div>
                  <div className="grid grid-cols-7 gap-1">{Array(currentMonth.add(1, 'month').startOf('month').day()).fill(null).map((_, idx) => <div key={`empty-right-${idx}`} />)}{Array(currentMonth.add(1, 'month').daysInMonth()).fill(0).map((_, idx) => {const day = idx + 1; const date = currentMonth.add(1, 'month').date(day); const isPastDate = date.isBefore(dayjs(), 'day'); const inRange = isInRange(date); const isCheckIn = dates.checkIn && date.isSame(dates.checkIn, "day"); const isCheckOut = dates.checkOut && date.isSame(dates.checkOut, "day");
                    return (<motion.div key={`right-${day}`} onClick={() => !isPastDate && handleDateClick(date)} whileHover={{ scale: isPastDate || prefersReducedMotion ? 1 : 1.1 }} whileTap={{ scale: isPastDate || prefersReducedMotion ? 1 : 0.95 }} className={`h-10 flex items-center justify-center rounded-full transition-all duration-200 font-semibold relative z-10 ${isPastDate ? "text-slate-400 cursor-not-allowed" : isCheckIn || isCheckOut ? "bg-indigo-600 text-white shadow-md cursor-pointer" : inRange ? "bg-indigo-100 text-indigo-700 cursor-pointer" : "hover:bg-slate-100 text-slate-900 cursor-pointer"}`}>{day}</motion.div>);})}
                  </div>
                </div>
              </div>
              <motion.div
                className="mt-6 px-6 py-4 border-t flex items-center justify-between rounded-b-3xl"
                initial={{
                  borderColor: "rgb(229 231 235)", // slate-200
                  backgroundColor: "rgb(249 250 251)", // slate-50
                }}
                animate={{
                  borderColor: dates.checkIn && dates.checkOut ? "rgb(99 102 241)" : "rgb(229 231 235)", // indigo-500 : slate-200
                  backgroundColor: dates.checkIn && dates.checkOut ? "rgb(199 210 254)" : "rgb(249 250 251)", // indigo-200 : slate-50
                }}
                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.5 }}
              >
                <div>
                  <p className={`text-sm text-slate-900 ${dates.checkIn && dates.checkOut ? 'font-extrabold' : 'font-bold'}`}>
                    {totalNights > 0 ? `${totalNights} nights` : 'Select dates'}
                  </p>
                  <p className={`text-xs text-slate-500 ${dates.checkIn && dates.checkOut ? 'font-semibold' : ''}`}>
                    {dates.checkIn ? `${dayjs(dates.checkIn).format("MMM DD")} - ${dates.checkOut ? dayjs(dates.checkOut).format("MMM DD") : ''}` : 'Add your travel dates for exact pricing'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <motion.button onClick={handleClearDates} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="font-semibold text-slate-600 text-sm py-2 px-4 rounded-full hover:bg-slate-200 transition-colors cursor-pointer">Clear</motion.button>
                  <motion.button
                    onClick={() => setActiveSection("who")}
                    disabled={!dates.checkIn || !dates.checkOut}
                    className="font-semibold text-white bg-indigo-600 text-sm py-2 px-4 rounded-full disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
                    animate={isSearchReady ? { scale: [1, 1.03, 1] } : {}}
                    transition={isSearchReady ? { duration: 0.3, repeat: 2, repeatType: "mirror" } : {}}
                  >
                    Next
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeSection === "who" && (
          <motion.div
            key="who"
            ref={whoDropdownRef}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={prefersReducedMotion ? { duration: 0 } : {}}
            className="absolute top-16 left-0 w-full p-6 bg-slate-50 rounded-3xl shadow-xl shadow-slate-400/10 border border-slate-200/80 flex flex-col"
          >
            <motion.div variants={itemVariants}>
              <h3 className="text-xl font-bold text-slate-800">Who&apos;s joining the adventure? 🫂</h3>
              <p className="text-sm text-slate-500 mb-6">Your trip is for {totalNights} nights in {selectedCity.name}.</p>
            </motion.div>
            <div className="flex flex-col">
              <motion.div variants={itemVariants} className="flex items-center justify-between py-4 rounded-lg">
                <div><p className="font-semibold text-slate-800 text-lg">Adults</p><p className="text-sm text-slate-500">Ages 13 or above</p></div>
                <div className="flex items-center space-x-3"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setAdults(Math.max(0, adults - 1))} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500 disabled:opacity-50" disabled={adults === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg></motion.button><AnimatePresence mode="wait"><motion.span key={adults} initial={{y: 8, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -8, opacity: 0}} transition={{duration: 0.2, ease: "anticipate"}} className="text-lg font-bold w-6 text-center text-slate-900">{adults}</motion.span></AnimatePresence><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setAdults(adults + 1)} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></motion.button></div>
              </motion.div>
              <AnimatePresence>
                {adults > 0 && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut", staggerChildren: 0.05 }}
                    className="flex flex-col overflow-hidden"
                  >
                    <motion.div variants={itemVariants} className="border-t border-slate-200"></motion.div>
                    <motion.div variants={itemVariants} className="flex items-center justify-between py-4 rounded-lg"><div><p className="font-semibold text-slate-800 text-lg">Children</p><p className="text-sm text-slate-500">Ages 2-12</p></div><div className="flex items-center space-x-3"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setChildrenState(Math.max(0, childrenState - 1))} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500 disabled:opacity-50" disabled={childrenState === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg></motion.button><AnimatePresence mode="wait"><motion.span key={childrenState} initial={{y: 8, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -8, opacity: 0}} transition={{duration: 0.2, ease: "anticipate"}} className="text-lg font-bold w-6 text-center text-slate-900">{childrenState}</motion.span></AnimatePresence><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setChildrenState(childrenState + 1)} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></motion.button></div></motion.div>
                    <motion.div variants={itemVariants} className="border-t border-slate-200"></motion.div>
                    <motion.div variants={itemVariants} className="flex items-center justify-between py-4 rounded-lg"><div><p className="font-semibold text-slate-800 text-lg">Infants</p><p className="text-sm text-slate-500">Under 2</p></div><div className="flex items-center space-x-3"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setInfants(Math.max(0, infants - 1))} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500 disabled:opacity-50" disabled={infants === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg></motion.button><AnimatePresence mode="wait"><motion.span key={infants} initial={{y: 8, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -8, opacity: 0}} transition={{duration: 0.2, ease: "anticipate"}} className="text-lg font-bold w-6 text-center text-slate-900">{infants}</motion.span></AnimatePresence><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setInfants(infants + 1)} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></motion.button></div></motion.div>
                    <motion.div variants={itemVariants} className="border-t border-slate-200"></motion.div>
                    <motion.div variants={itemVariants} className="flex items-center justify-between py-4 rounded-lg"><div><p className="font-semibold text-slate-800 text-lg">Pets</p><p className="text-sm text-slate-500">Bringing a service animal?</p></div><div className="flex items-center space-x-3"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setPets(Math.max(0, pets - 1))} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500 disabled:opacity-50" disabled={pets === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg></motion.button><AnimatePresence mode="wait"><motion.span key={pets} initial={{y: 8, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -8, opacity: 0}} transition={{duration: 0.15}} className="text-lg font-bold w-6 text-center text-slate-900">{pets}</motion.span></AnimatePresence><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setPets(pets + 1)} className="p-1 rounded-full border border-slate-300 text-slate-600 hover:border-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></motion.button></div></motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};
export default ModernSearchBar;
