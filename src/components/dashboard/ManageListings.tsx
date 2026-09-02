"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Star,
  Home,
  Plus,
  Edit2,

  Eye,
  Users,
  Sparkles
} from "lucide-react";
import supabase, { getListingsByHostId, fetchListingById, updateListing, reimportAmenities } from "@/services/api";
import type { ListingData } from "@/types";
import { useBottomNavBar } from "@/context/BottomNavBarContext";
import EditListingView from "../EditListingView";
import { triggerHaptic } from "@/lib/haptics";
import ImportListingPage from "../import/ImportListingPage";
import { useNavigation } from "@/hooks/useNavigation";
import { Switch } from "@/components/ui/switch";
import { reverseGeocode } from "@/lib/googleMaps";
import VerifiedDrawer from "./VerifiedDrawer";
import RoovoLoader from "../RoovoLoader";
import { Toast, type ToastType } from "@/components/ui/toast";
import InviteCohostDrawer from "../cohosts/InviteCohostDrawer";


// --- Utility Components ---

const StatusBadge = ({ status, isScrapeDraft }: { status?: string; isScrapeDraft?: boolean }) => {
  if (isScrapeDraft) {
    return (
      <div className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
        Draft
      </div>
    );
  }

  const isActive = status === "active";
  return (
    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-2xs ${isActive
      ? "bg-emerald-600 text-white"
      : "bg-slate-700 text-slate-200"
      }`}>
      {isActive ? "Active" : "Inactive"}
    </div>
  );
};

// Removed SkeletonCard in favor of RoovoLoader


// --- Main Component ---

export default function ManageListings() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showImportPage, setShowImportPage] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { setIsNavBarVisible } = useBottomNavBar();

  // Subscription State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [listingForSubscription, setListingForSubscription] = useState<{ id: string; title: string; image?: string } | null>(null);

  // Unlist/Delete State
  // Unlist/Delete State (Removed as per new requirements)
  // const [showUnlistModal, setShowUnlistModal] = useState(false);
  // const [actionLoading, setActionLoading] = useState(false);
  // const [listingToAction, setListingToAction] = useState<any>(null);

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: "",
    type: "success"
  });

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ show: true, message, type });
  };

  // Co-Host Invitation State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [listingToInvite, setListingToInvite] = useState<any>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"all" | "active" | "draft">("all");

  // Ensure nav bar is visible when component unmounts
  useEffect(() => {
    return () => setIsNavBarVisible(true);
  }, [setIsNavBarVisible]);

  // Toggle navbar visibility when import page is shown
  useEffect(() => {
    setIsNavBarVisible(!showImportPage);
  }, [showImportPage, setIsNavBarVisible]);

  // Fetch Initial List
  const fetchHostListings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: host } = await supabase.from("hosts").select("id").eq("user_id", session.user.id).single();

        // Fetch active listings
        let activeListings: ListingData[] = [];
        if (host) {
          activeListings = await getListingsByHostId(host.id);
        }

        // Fetch drafts
        const { data: drafts } = await supabase
          .from("listing_scrape_draft")
          .select("*")
          .eq("created_by", session.user.id);

        const formattedDrafts = (drafts || []).map((draft: any) => ({
          id: draft.id,
          title: draft.public_name || "Untitled Draft",
          property_type: draft.property_type || "Apartment",
          price_per_night: draft.price || 0,
          primary_image_url: draft.picture_url,
          status: "draft",
          is_scrape_draft: true,
          overall_rating: draft.rating,
          location: draft.location,
          host_id: session.user.id,
          max_guests: draft.max_guest_capacity || 0,
          // Mocking required fields for draft display
          latitude: 0,
          longitude: 0,
          propertyDetails: {},
          property_description: { theSpace: "", guestAccess: null, otherThingsToNote: null },
          accommodation: { sleepingArrangements: [], totalBathrooms: 0 },
          booking_and_availability: { price: { pricePerNight: 0, priceBreakdown: { basePrice: "0", total: "0" }, priceDisclaimer: "" }, availability: { selectedDates: { checkIn: "", checkOut: "", nights: 0 } }, cancellationPolicy: "" },
          house_rules: { checkIn: "", checkOut: "", maxGuests: 0, petsAllowed: false, smokingAllowed: false, commercialPhotographyAllowed: false, additionalRules: [] },
          amenities: { included: [], notIncluded: [] },
          ratings_and_reviews: { overallRating: 0, totalReviews: 0, detailedRatings: { cleanliness: 0, accuracy: 0, checkIn: 0, communication: 0, location: 0, value: 0 }, individualReviews: [] },
          host_information: { name: "", profilePictureUrl: "", isSuperhost: false, hostingSince: "", stats: { reviews: 0, averageRating: 0, responseRate: null, responseTime: null }, bio: [] },
          location_and_neighborhood: { address: "", latitude: 0, longitude: 0, neighborhoodDescription: "", gettingAround: "" },
          media: { primaryImageUrl: "", allImageUrls: [] }
        } as unknown as ListingData));

        setListings([...activeListings, ...formattedDrafts]);
      }
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchHostListings();
  }, []);

  // Filter Listings based on Tab
  const filteredListings = useMemo(() => {
    if (activeTab === "all") return listings;
    if (activeTab === "active") return listings.filter(l => !l.is_scrape_draft && l.status === 'active');
    if (activeTab === "draft") return listings.filter(l => l.is_scrape_draft);
    return listings;
  }, [listings, activeTab]);

  // Handle Opening Detail
  const openListing = async (listing: ListingData) => {
    triggerHaptic().catch(() => { });

    if (listing.is_scrape_draft) {
      setSelectedDraftId(String(listing.id));
      setShowImportPage(true);
      return;
    }

    setIsDetailLoading(true);
    setSelectedListing(listing);
    setIsNavBarVisible(false);

    try {
      const fullDetails = await fetchListingById(String(listing.id));

      // Reverse geocode if location is missing
      let placeText = fullDetails.place || fullDetails.public_address;
      if ((!placeText || placeText === "Beautiful Stay") && (fullDetails.fuzzy_lat || fullDetails.exact_lat) && (fullDetails.fuzzy_lng || fullDetails.exact_lng)) {
        const lat = fullDetails.fuzzy_lat || fullDetails.exact_lat;
        const lng = fullDetails.fuzzy_lng || fullDetails.exact_lng;
        try {
          const address = await reverseGeocode(parseFloat(lat), parseFloat(lng));
          if (address) {
            placeText = address;
          }
        } catch (err) {
          console.error("Failed to reverse geocode in ManageListings", err);
        }
      }

      setSelectedListing((prev: any) => ({
        ...prev,
        ...fullDetails,
        place: placeText || "Beautiful Stay"
      }));
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

  const handleSaveListing = async (updatedData: any) => {
    if (!selectedListing?.id) return;

    try {
      setIsDetailLoading(true);
      await updateListing(String(selectedListing.id), updatedData);
      await triggerHaptic();

      // Refresh the list and the details
      await fetchHostListings();
      const fullDetails = await fetchListingById(String(selectedListing.id));
      setSelectedListing((prev: any) => ({ ...prev, ...fullDetails }));

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update listing:", error);
      await triggerHaptic();
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleTabSwitch = (tab: "all" | "active" | "draft") => {
    triggerHaptic().catch(() => { });
    setActiveTab(tab);
  };

  const toggleListingStatus = async (checked: boolean, listing: ListingData) => {
    // Optimistic update
    const newStatus = checked ? 'active' : 'draft';
    const oldStatus = listing.status;

    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));

    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));

    try {
      triggerHaptic().catch(() => { });
      await updateListing(String(listing.id), { is_enabled: checked });
      showToast(checked ? "Listing active" : "Listing unlisted", "success");
    } catch (err) {
      console.error("Failed to toggle status", err);
      // Revert
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: oldStatus } : l));
      triggerHaptic().catch(() => { });
    }
  };

  const { navigate } = useNavigation();

  const handleImportSuccess = (listingId: string) => {
    setShowImportPage(false);
    navigate(`/listing/${listingId}`);
  };

  const handleOpenSubscription = (e: React.MouseEvent, listing: ListingData) => {
    e.stopPropagation();
    setListingForSubscription({ id: String(listing.id), title: listing.title, image: listing.primary_image_url });
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionSuccess = () => {
    // Refresh listings to show verified status
    fetchHostListings();
  };





  return (
    <div className="relative w-full h-[100dvh] bg-gray-50 text-gray-900 overflow-hidden flex flex-col">

      {/* --- Modern Header with Tabs --- */}
      <header className="px-4 pt-3 pb-2">
        {/* Title & Action Row */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Your Listings</h1>
            <p className="text-xs text-gray-500 font-medium">Manage availability, pricing & details</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowImportPage(true)}
            className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-full shadow-xs flex items-center gap-1.5 font-semibold text-xs active:bg-indigo-700 transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Import</span>
          </motion.button>
        </div>

        {/* Segmented Control / Tabs */}
        <div className="flex p-1 rounded-xl relative mb-1 bg-gray-100/70">
          <motion.div
            className="absolute top-1 bottom-1 bg-white rounded-lg shadow-xs z-0"
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
              className={`flex-1 relative z-10 py-1.5 text-xs font-semibold capitalize transition-colors duration-200 ${activeTab === tab ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* --- Listing Feed --- */}
      <main className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-24 scrollbar-hide">
        {isLoadingList ? (
          <div className="flex items-center justify-center h-64">
            <RoovoLoader />
          </div>
        ) : (
          <AnimatePresence mode="sync">
            {filteredListings.length > 0 ? (
              filteredListings.map((listing, index) => (
                <motion.button
                  key={listing.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", damping: 25, stiffness: 300, delay: index * 0.04 }}
                  onClick={() => openListing(listing)}
                  className="w-full text-left appearance-none group relative bg-white border border-gray-200/80 rounded-2xl p-3 flex gap-3 cursor-pointer active:scale-[0.99] transition-all duration-200 shadow-2xs hover:border-gray-300"
                >
                  {/* Left: Compact Square Thumbnail */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {listing.primary_image_url ? (
                      <img
                        src={listing.primary_image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Home size={24} />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5">
                      <StatusBadge status={listing.status} isScrapeDraft={listing.is_scrape_draft} />
                    </div>
                  </div>

                  {/* Right: Rich Details in Compact Modern Typography */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <h2 className="font-semibold text-sm leading-snug text-gray-900 truncate flex-1">
                          {listing.title}
                        </h2>
                        {!listing.is_scrape_draft && (
                          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-1">
                            <Switch
                              checked={listing.status === 'active'}
                              onCheckedChange={(checked) => toggleListingStatus(checked, listing)}
                              className="data-[state=checked]:bg-emerald-500 scale-90"
                            />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={12} className="text-indigo-500 flex-shrink-0" />
                        <span>{listing.property_type || "Apartment"}</span>
                        {listing.location && <span>• {listing.location}</span>}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-900">₹{listing.price_per_night}</span>
                        <span className="text-[11px] text-gray-400 font-medium">/ night</span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!listing.is_scrape_draft && (
                          listing.is_roovo_verified ? (
                            <div className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center gap-1 shadow-2xs">
                              <img src="/verified.png" alt="Verified" className="w-2.5 h-2.5 object-contain" />
                              <span>Verified</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSubscription(e, listing);
                              }}
                              className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border border-gray-200 text-gray-500 flex items-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <img src="/verified.png" alt="Get Verified" className="w-2.5 h-2.5 object-contain grayscale opacity-60" />
                              <span>Get Badge</span>
                            </button>
                          )
                        )}
                        <div className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-700">
                          <Star size={11} className="fill-yellow-400 text-yellow-400" />
                          <span>4.9</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
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
            onInvite={() => {
              setListingToInvite(selectedListing);
              setShowInviteModal(true);
            }}
            onRefresh={async () => {
              await fetchHostListings();
              const fullDetails = await fetchListingById(String(selectedListing.id));
              setSelectedListing((prev: any) => ({ ...prev, ...fullDetails }));
            }}
            loading={isDetailLoading}
          />
        )}
      </AnimatePresence>

      {/* --- Floating Action Button (REMOVED: Moved to Header) --- */}

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

      {/* --- Import Listing Page --- */}
      <AnimatePresence>
        {showImportPage && (
          <ImportListingPage
            onClose={() => {
              setShowImportPage(false);
              setSelectedDraftId(null);
              fetchHostListings();
            }}
            onSuccess={(id) => {
              handleImportSuccess(id);
              fetchHostListings();
            }}
            draftId={selectedDraftId || undefined}
          />
        )}
      </AnimatePresence>

      {/* --- Subscription Modal --- */}
      <AnimatePresence>
        {showSubscriptionModal && listingForSubscription && (
          <VerifiedDrawer
            listingId={listingForSubscription.id}
            listingTitle={listingForSubscription.title}
            listingImage={listingForSubscription.image}
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            onSuccess={handleSubscriptionSuccess}
          />
        )}
      </AnimatePresence>

      {listingToInvite && (
        <InviteCohostDrawer
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setListingToInvite(null);
          }}
          listing={listingToInvite}
          onInviteSent={() => {
            showToast("Invitation(s) created!", "success");
          }}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
        position="bottom"
      />
    </div>
  );
}

// --- Sub-Component: Detailed View ---

function DetailView({ listing, onClose, onEdit, onInvite, onRefresh, loading }: { listing: any; onClose: () => void; onEdit: () => void; onInvite: () => void; onRefresh: () => void; loading: boolean; }) {
  const [isVerifiedDrawerOpen, setIsVerifiedDrawerOpen] = useState(false);
  const [isReimporting, setIsReimporting] = useState(false);

  const resolveAmenities = () => {
    if (listing.included_amenities && listing.included_amenities.length > 0) return listing.included_amenities;
    if (Array.isArray(listing.amenities_data)) {
      if (listing.amenities_data.length > 0 && typeof listing.amenities_data[0] === 'object' && 'title' in listing.amenities_data[0]) {
        return listing.amenities_data.filter((item: any) => item.available).map((item: any) => item.title);
      }
      return listing.amenities_data.reduce((acc: string[], curr: any) => [...acc, ...(curr.items || [])], []);
    }
    return [];
  };
  const activeAmenities = resolveAmenities();

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Detail Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-transparent pointer-events-none">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform pointer-events-auto z-50 text-black"
        >
          <span className="text-2xl font-bold leading-none pb-1">&#8592;</span>
        </button>
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
              <MapPin size={14} /> {listing.place || listing.public_address || "Beautiful Stay"}
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
            {listing.description ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: listing.description }}
              />
            ) : (
              "No description provided."
            )}
            {loading && <div className="mt-2 h-4 w-2/3 bg-gray-200 animate-pulse rounded" />}
          </div>
        </div>

        {/* Amenities */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">What this place offers</h3>
          <div className="flex flex-wrap gap-3">
            {activeAmenities.length > 0 ? (
              activeAmenities.map((item: string) => (
                <span key={item} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700">
                  {item}
                </span>
              ))
            ) : (
              <div className="w-full flex flex-col gap-3">
                <p className="text-sm text-gray-500 italic">No amenities listed.</p>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isReimporting) return;
                    setIsReimporting(true);
                    try {
                      triggerHaptic().catch(() => { });
                      await reimportAmenities(String(listing.id));
                      triggerHaptic().catch(() => { });
                      onRefresh();
                    } catch (err) {
                      console.error("Failed to reimport amenities", err);
                    } finally {
                      setIsReimporting(false);
                    }
                  }}
                  disabled={isReimporting}
                  className="flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={16} className={isReimporting ? "animate-spin" : ""} />
                  {isReimporting ? "Re-importing..." : "Re-import Amenities"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-safe-bottom flex items-center gap-3 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">

        {/* Primary Action: Edit */}
        <button
          onClick={onEdit}
          className="flex-[1.5] bg-gray-900 text-white font-bold h-14 rounded-2xl transition-all active:scale-95 shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 text-base"
        >
          <Edit2 size={18} strokeWidth={2.5} />
          Edit Listing
        </button>

        <button
          onClick={onInvite}
          className="flex-1 bg-indigo-50 text-indigo-700 font-bold h-14 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
        >
          <Users size={18} strokeWidth={2.5} />
          Invite
        </button>
      </div>

      {/* Floating Preview Button */}
      <button
        className="absolute bottom-32 right-6 bg-white text-gray-900 border border-gray-100 p-4 rounded-full shadow-2xl z-40 active:scale-90 transition-all border-indigo-50 group"
      >
        <Eye size={24} className="text-indigo-600 group-hover:scale-110 transition-transform" />
      </button>

      <VerifiedDrawer
        isOpen={isVerifiedDrawerOpen}
        onClose={() => setIsVerifiedDrawerOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
        listingImage={listing.primary_image_url}
        onSuccess={() => {
          setIsVerifiedDrawerOpen(false);
          // Ideally refresh listings here, but DetailView doesn't have access to fetchHostListings
          // We could pass a refresh callback if needed, or rely on main view refresh
        }}
      />
    </motion.div>
  );
}
