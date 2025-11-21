"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase, { getListingsByHostId, fetchListingById } from "@/services/api";
import type { ListingData } from "@/types";
import RoovoLoader from "./RoovoLoader";
import BackButton from "./BackButton";

// --- Reusable Mobile Components ---

const ActionButton = ({ onClick, children, variant = "primary", disabled = false }: any) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2
      disabled:opacity-50 disabled:cursor-not-allowed transition-all
      ${variant === "primary"
        ? "bg-indigo-600 text-white shadow-indigo-500/25"
        : "bg-neutral-800 text-neutral-200 border border-white/10"}
    `}
  >
    {children}
  </motion.button>
);

const InputField = ({ label, value, onChange, type = "text", prefix }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative bg-neutral-900 rounded-2xl border border-white/10 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all overflow-hidden">
      {prefix && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">
          {prefix}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full bg-transparent p-4 text-lg text-white placeholder-neutral-600 outline-none
          ${prefix ? "pl-10" : ""}
        `}
      />
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-neutral-900 border border-white/10 text-white text-lg rounded-2xl p-4 pr-10 outline-none focus:border-indigo-500 transition-all"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  </div>
);

const Counter = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-between bg-neutral-900 p-2 rounded-2xl border border-white/10">
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => value > 1 && onChange(value - 1)}
      className="w-12 h-12 flex items-center justify-center bg-neutral-800 rounded-xl text-white hover:bg-neutral-700"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
    </motion.button>
    <span className="text-2xl font-bold text-white font-mono">{value}</span>
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onChange(value + 1)}
      className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    </motion.button>
  </div>
);

export default function ManageListings() {
  // --- State ---
  const [listings, setListings] = useState<ListingData[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null); // This acts as the router

  // Form State
  const [guestCount, setGuestCount] = useState(1);
  const [activeTab, setActiveTab] = useState("Property");
  const [propertyType, setPropertyType] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const fetchHostListings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: host } = await supabase.from("hosts").select("id").eq("user_id", session.user.id).single();
          if (host) {
            const data = await getListingsByHostId(host.id);
            setListings(data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHostListings();
  }, []);

  useEffect(() => {
    if (selectedListing) {
      setPropertyType(selectedListing.property_type || "");
      setGuestCount(selectedListing.guests || 1);
      setCheckInTime(selectedListing.booking_and_availability?.houseRules?.checkIn || "");
      setCheckOutTime(selectedListing.booking_and_availability?.houseRules?.checkOut || "");
    }
  }, [selectedListing]);

  // --- Handlers ---
  const openListing = async (listing: ListingData) => {
    console.log("Attempting to open listing:", listing);
    try {
      const fullDetails = await fetchListingById(String(listing.id));
      console.log("Fetched full details:", fullDetails);
      setSelectedListing(fullDetails);
      console.log("Set selected listing.");
    } catch (error) {
      console.error("Failed to fetch listing details:", error);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate network request
    setTimeout(() => {
      setIsSaving(false);
      // Optional: Show success toast here
    }, 1000);
  };

  const TABS = ["Property", "Pricing", "Details", "Amenities", "Rules"];

  if (loading) return <div className="h-screen w-full bg-black flex items-center justify-center"><RoovoLoader /></div>;

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden font-sans">

      {/* ========================== */}
      {/* SCREEN 1: LIST VIEW        */}
      {/* ========================== */}
      <motion.div
        className="absolute inset-0 flex flex-col z-10"
        animate={{ scale: selectedListing ? 0.92 : 1, opacity: selectedListing ? 0.5 : 1, x: selectedListing ? "-20%" : "0%" }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* Header */}
        <div className="pt-[calc(env(safe-area-inset-top)+1rem)] px-6 pb-4 bg-black/80 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5">
          <div className="flex items-center justify-between mt-2">
            <BackButton />
            <h1 className="text-xl font-bold tracking-tight">Your Listings</h1>
            <div className="w-8" /> {/* Spacer for balance */}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {listings.map((listing) => (
            <motion.div
              key={listing.id}
              layoutId={`card-container-${listing.id}`}
              onClick={() => openListing(listing)}
              whileTap={{ scale: 0.98 }}
              className="bg-neutral-900 rounded-3xl p-3 border border-white/5 shadow-xl overflow-hidden cursor-pointer relative pointer-events-auto"
            >
              <div className="flex gap-4">
                <motion.div
                  layoutId={`image-${listing.id}`}
                  className="w-24 h-24 rounded-2xl bg-neutral-800 overflow-hidden shrink-0"
                >
                  <img src={listing.primary_image_url} className="w-full h-full object-cover" alt="" />
                </motion.div>
                <div className="flex-1 py-1 pr-2 min-w-0">
                  <motion.h3 layoutId={`title-${listing.id}`} className="font-bold text-lg leading-tight truncate text-white">
                    {listing.title}
                  </motion.h3>
                  <p className="text-neutral-400 text-sm mt-1 line-clamp-2 leading-relaxed">
                    {listing.description || "No description provided."}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded-lg">
                      ₹{listing.price_per_night}
                    </span>
                    <span className="text-xs text-neutral-500">{listing.property_type}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ========================== */}
      {/* SCREEN 2: EDIT VIEW        */}
      {/* ========================== */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div
            key="detail-view"
            className="absolute inset-0 z-50 bg-black flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* 1. Detail Header (Transparent) */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedListing(null)}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </motion.button>
              <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-bold text-white/80">
                Edit Mode
              </div>
            </div>

            {/* 2. Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">

              {/* Hero Image */}
              <div className="relative h-[35vh] w-full">
                <motion.div layoutId={`image-${selectedListing.id}`} className="w-full h-full">
                  <img src={selectedListing.primary_image_url} className="w-full h-full object-cover" alt="" />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <motion.h2 layoutId={`title-${selectedListing.id}`} className="text-3xl font-extrabold leading-tight text-white mb-2">
                    {selectedListing.title}
                  </motion.h2>
                  <div className="flex items-center gap-2 text-sm text-neutral-300">
                    <span className="opacity-70">Hosted by</span>
                    <span className="font-semibold text-white">{selectedListing.host_name || "You"}</span>
                  </div>
                </div>
              </div>

              {/* Sticky Tabs */}
              <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-xl border-b border-white/10 pb-1">
                <div className="flex overflow-x-auto px-6 py-4 gap-3 scrollbar-hide">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                        ${activeTab === tab
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-neutral-900 text-neutral-400 border border-white/5"}
                      `}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-8 pb-32 min-h-[50vh]">

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* --- Property Tab --- */}
                    {activeTab === "Property" && (
                      <>
                        <SelectField
                          label="Property Type"
                          value={propertyType}
                          onChange={setPropertyType}
                          options={["Apartment", "House", "Villa", "Guest Suite", "Unique Space"]}
                        />
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Guest Capacity</label>
                          <Counter value={guestCount} onChange={setGuestCount} />
                        </div>
                      </>
                    )}

                    {/* --- Pricing Tab --- */}
                    {activeTab === "Pricing" && (
                      <>
                        <InputField
                          label="Weekday Price"
                          type="number"
                          prefix="₹"
                          value={selectedListing.price_per_night}
                          onChange={(v: any) => setSelectedListing({ ...selectedListing, price_per_night: v })}
                        />

                        <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10">
                          <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-white">Weekend Surge</label>
                            <div className="w-10 h-6 rounded-full bg-indigo-600/30 border border-indigo-500 relative">
                              <div className="absolute right-0.5 top-0.5 bottom-0.5 w-5 bg-indigo-400 rounded-full shadow-sm" />
                            </div>
                          </div>
                          <p className="text-xs text-neutral-500 mb-4">Automatically increase price by 7% on Fri/Sat.</p>
                          <InputField
                            label="Weekend Price"
                            type="number"
                            prefix="₹"
                            value={selectedListing.weekend_price || (selectedListing.price_per_night * 1.07).toFixed(0)}
                            onChange={(v: any) => setSelectedListing({ ...selectedListing, weekend_price: v })}
                          />
                        </div>
                      </>
                    )}

                    {/* --- Details Tab --- */}
                    {activeTab === "Details" && (
                      <>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <InputField label="Check In" type="time" value={checkInTime} onChange={setCheckInTime} />
                          </div>
                          <div className="flex-1">
                            <InputField label="Check Out" type="time" value={checkOutTime} onChange={setCheckOutTime} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Description</label>
                          <textarea
                            rows={6}
                            value={selectedListing.the_space || ""}
                            onChange={(e) => setSelectedListing({ ...selectedListing, the_space: e.target.value })}
                            className="w-full bg-neutral-900 rounded-2xl p-4 text-white border border-white/10 focus:border-indigo-500 outline-none leading-relaxed"
                          />
                        </div>
                      </>
                    )}

                    {/* --- Amenities Placeholder --- */}
                    {activeTab === "Amenities" && (
                      <div className="grid grid-cols-2 gap-3">
                        {(selectedListing.included_amenities || []).map((amenity: string, i: number) => (
                          <div key={i} className="bg-neutral-900 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-sm font-medium text-neutral-300">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* 3. Sticky Footer Action */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-gradient-to-t from-black via-black to-transparent z-30">
              <ActionButton onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Save Changes</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </>
                )}
              </ActionButton>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
