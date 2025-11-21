"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  MapPin,
  Star,
  Edit3,
  Home
} from "lucide-react";
import supabase, { getListingsByHostId, fetchListingById } from "@/services/api";
import type { ListingData } from "@/types";
import { useBottomNavBar } from "@/context/BottomNavBarContext";
import EditListingView from "../EditListingView";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

// --- Utility Components ---

const StatusBadge = ({ status }: { status?: string }) => {
  const isLive = status === "active" || true; // Mock logic for demo
  return (
    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isLive
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : "bg-neutral-800 border-neutral-700 text-neutral-400"
      }`}>
      {isLive ? "Live" : "Draft"}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-5 w-3/4 bg-gray-200 rounded" />
      <div className="h-4 w-1/2 bg-gray-200 rounded" />
    </div>
  </div>
);

// --- Main Component ---

export default function ManageListings() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const { setIsNavBarVisible } = useBottomNavBar();

  // Tab State
  const [activeTab, setActiveTab] = useState<"all" | "active" | "draft">("all");

  // Ensure nav bar is visible when component unmounts
  useEffect(() => {
    return () => setIsNavBarVisible(true);
  }, [setIsNavBarVisible]);

  // Fetch Initial List
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
        console.error("Error fetching listings:", err);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchHostListings();
  }, []);

  // Filter Listings based on Tab
  const filteredListings = useMemo(() => {
    if (activeTab === "all") return listings;
    if (activeTab === "active") return listings.filter(l => l.status === "active" || true); // Mock logic
    if (activeTab === "draft") return listings.filter(l => l.status === "draft");
    return listings;
  }, [listings, activeTab]);

  // Handle Opening Detail
  const openListing = async (listing: ListingData) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    setIsDetailLoading(true);
    setSelectedListing(listing);
    setIsNavBarVisible(false);

    try {
      const fullDetails = await fetchListingById(String(listing.id));
      setSelectedListing((prev: any) => ({ ...prev, ...fullDetails }));
    } catch (error) {
      console.error("Failed to fetch listing details:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeListing = () => {
    setSelectedListing(null);
    setIsEditing(false);
    setIsNavBarVisible(true);
  };

  const handleSaveListing = (updatedListing: any) => {
    setSelectedListing(updatedListing);
    setListings(prev => prev.map(l => l.id === updatedListing.id ? updatedListing : l));
    setIsEditing(false);
  };

  const handleTabSwitch = async (tab: "all" | "active" | "draft") => {
    await Haptics.impact({ style: ImpactStyle.Light });
    setActiveTab(tab);
  };

  return (
    <div className="relative w-full h-screen bg-gray-50 text-gray-900 overflow-hidden flex flex-col">

      {/* --- Modern Header with Tabs --- */}
      <header className="pt-[calc(env(safe-area-inset-top)+0.5rem)] px-4 pb-2 bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-gray-200 shadow-sm">
        <div className="h-4" /> {/* Spacer for status bar area if needed, or just padding */}

        {/* Segmented Control / Tabs */}
        <div className="flex p-1 rounded-xl relative mb-2">
          {/* Animated Background for Active Tab */}
          <motion.div
            className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm z-0"
            layoutId="activeTabBackground"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            style={{
              left: activeTab === "all" ? "4px" : activeTab === "active" ? "33.33%" : "66.66%",
              width: "calc(33.33% - 5px)",
              x: activeTab === "all" ? 0 : activeTab === "active" ? 2 : 4
            }}
          />

          {(["all", "active", "draft"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className={`flex-1 relative z-10 py-2 text-sm font-semibold capitalize transition-colors duration-200 ${activeTab === tab ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* --- Listing Feed --- */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 scrollbar-hide">
        {isLoadingList ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredListings.length > 0 ? (
              filteredListings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", damping: 25, stiffness: 300, delay: index * 0.05 }}
                  onClick={() => openListing(listing)}
                  className="group relative bg-white border border-gray-200 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-200 shadow-lg shadow-gray-200/50"
                >
                  {/* Card Image Area */}
                  <div className="relative h-52 w-full bg-gray-200">
                    {listing.primary_image_url ? (
                      <img
                        src={listing.primary_image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Home size={32} />
                      </div>
                    )}

                    <div className="absolute top-4 left-4">
                      <StatusBadge status={listing.status} />
                    </div>
                    <div className="absolute bottom-3 right-4 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1">
                      <span className="text-xs font-semibold text-gray-900">₹{listing.price_per_night}</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h2 className="font-bold text-lg leading-snug text-gray-900 mb-1 line-clamp-1">
                          {listing.title}
                        </h2>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                          <MapPin size={14} className="text-indigo-500" />
                          {listing.property_type || "Apartment"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <Star size={12} className="fill-yellow-500 text-yellow-500" />
                        <span>4.9</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-gray-500 gap-4 mt-20"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Home size={32} className="text-gray-400" />
                </div>
                <p className="font-medium">No {activeTab} listings found.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* --- Detail View Overlay --- */}
      <AnimatePresence>
        {selectedListing && !isEditing && (
          <DetailView
            listing={selectedListing}
            onClose={closeListing}
            onEdit={() => setIsEditing(true)}
            loading={isDetailLoading}
          />
        )}
      </AnimatePresence>

      {/* --- Edit View --- */}
      <AnimatePresence>
        {isEditing && selectedListing && (
          <EditListingView
            listing={selectedListing}
            onClose={() => setIsEditing(false)}
            onSave={handleSaveListing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Component: Detailed View ---

function DetailView({ listing, onClose, onEdit, loading }: { listing: any; onClose: () => void; onEdit: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Detail Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] z-20 flex justify-between items-start bg-gradient-to-b from-white/80 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center text-black border border-black/10 active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex gap-3">
          <button className="w-10 h-10 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center text-black border border-black/10">
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      {/* Image Hero */}
      <div className="relative h-[45vh] w-full shrink-0 bg-gray-200">
        {listing.primary_image_url && (
          <img
            src={listing.primary_image_url}
            className="w-full h-full object-cover"
            alt={listing.title}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />

        <div className="absolute bottom-6 left-5 right-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight shadow-black drop-shadow-lg">
            {listing.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-800/90 font-medium">
            <span className="bg-indigo-100/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-indigo-800">
              {listing.property_type}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} /> India
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-32">

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pb-6 border-b border-gray-200">
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Price</p>
            <p className="text-lg font-semibold text-indigo-600">₹{listing.price_per_night}</p>
          </div>
          <div className="text-center space-y-1 border-l border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Guests</p>
            <p className="text-lg font-semibold">{listing.max_guests || 2}</p>
          </div>
          <div className="text-center space-y-1 border-l border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Rating</p>
            <p className="text-lg font-semibold flex items-center justify-center gap-1">
              4.9 <Star size={14} className="fill-yellow-500 text-yellow-500" />
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">About this space</h3>
          <div className="text-gray-700 leading-relaxed text-sm relative">
            {listing.description || "No description provided."}
            {loading && <div className="mt-2 h-4 w-2/3 bg-gray-200 animate-pulse rounded" />}
          </div>
        </div>

        {/* Amenities (Mock) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">What this place offers</h3>
          <div className="flex flex-wrap gap-3">
            {['Wifi', 'Kitchen', 'Washer', 'Air Conditioning', 'Pool'].map((item) => (
              <span key={item} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe-bottom">
        <div className="flex gap-3">
          <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3.5 rounded-xl transition-colors">
            Preview
          </button>
          <button
            onClick={onEdit}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
            <Edit3 size={18} />
            Edit Listing
          </button>
        </div>
      </div>
    </motion.div>
  );
}
