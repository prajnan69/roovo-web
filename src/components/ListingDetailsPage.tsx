"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Share, Star, MapPin, ShieldCheck, Check, X } from "lucide-react";
import { Share as CapShare } from '@capacitor/share';
import MobileImageCarousel from "@/components/MobileImageCarousel";
import RoovoLoader from "@/components/RoovoLoader";
import { fetchListingById } from "@/services/api";
import supabase from "@/services/api";
import ConfirmAndPay from "@/components/ConfirmAndPay";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import BookingDrawerContent from "@/components/BookingDrawerContent";
import BookingBar from "@/components/BookingBar";
import HouseRules from "@/components/HouseRules";
import DetailedRatings from "@/components/DetailedRatings";
import Reviews from "@/components/Reviews";
import { triggerHaptic } from "@/lib/haptics";
import MapView from "@/components/Map";

const ListingDetailsPage = ({ match }: { match: any }) => {
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotIncluded, setShowNotIncluded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showConfirmAndPay, setShowConfirmAndPay] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  const [isCurrentUserHost, setIsCurrentUserHost] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const id = match[1];

  const { scrollY } = useScroll();
  const imageOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const imageScale = useTransform(scrollY, [0, 300], [1, 1.15]);
  const headerBgOpacity = useTransform(scrollY, [200, 280], [0, 1]);
  const headerY = useTransform(scrollY, [0, 200], [0, -10]); // Subtle parallax for controls

  useEffect(() => {
    const loadListing = async () => {
      try {
        const data = await fetchListingById(id);
        setListing(data);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && data.host_id === session.user.id) {
          setIsCurrentUserHost(true);
        }
      } catch (e) {
        console.error("Error fetching:", e);
      } finally {
        setLoading(false);
      }
    };
    loadListing();
  }, [id]);

  const handleBackFromConfirmAndPay = () => {
    setShowConfirmAndPay(false);
  };

  const handleShare = async () => {
    triggerHaptic();
    await CapShare.share({
      title: listing.title,
      text: `Check out this listing on Roovo: ${listing.title}`,
      url: window.location.href,
      dialogTitle: 'Share this listing'
    });
  };

  const handleApplyFromDrawer = (dateRange: any, guests: number) => {
    if (dateRange?.from && dateRange?.to && listing) {
      const nights = Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24));
      const newBookingDetails = {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        guests: guests,
        nights: nights,
      };
      const pricePerNight = Number(listing.price_per_night) || 0;
      const totalPrice = pricePerNight * nights;
      const newPriceDetails = {
        pricePerNight: pricePerNight,
        totalPrice: totalPrice,
        taxes: totalPrice * 0.18,
      };
      setBookingDetails(newBookingDetails);
      setPriceDetails(newPriceDetails);
      setShowConfirmAndPay(true);
    }
    setIsDrawerOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <RoovoLoader className="w-32 h-32" />
      </div>
    );
  }

  if (!listing) {
    return <div className="flex items-center justify-center h-screen text-slate-500">Listing not found.</div>;
  }

  if (showConfirmAndPay && bookingDetails && priceDetails) {
    return (
      <ConfirmAndPay
        listing={{
          id: String(listing.id),
          title: listing.title,
          primary_image_url: listing.primary_image_url ?? "",
          overall_rating: listing.overall_rating ?? 0,
          total_reviews: listing.total_reviews ?? 0,
          cancellation_policy:
            listing.cancellation_policy ?? "No cancellation policy provided.",
        }}
        bookingDetails={bookingDetails}
        priceDetails={priceDetails}
        onBack={handleBackFromConfirmAndPay}
        host_id={listing.host_id}
        auto_bookable={listing.auto_bookable}
      />
    );
  }

  return (
    <div className="relative bg-white text-slate-900 min-h-screen w-full overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">

      {/* --- Dynamic Header Controls --- */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-4 flex justify-between items-center"
        style={{ backgroundColor: `rgba(255, 255, 255, ${headerBgOpacity.get()})`, backdropFilter: `blur(${headerBgOpacity.get() * 10}px)` }}
      >
        <motion.button
          onClick={() => {
            triggerHaptic();
            window.history.back();
          }}
          className="p-2.5 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-white/20 active:scale-95 transition-transform text-slate-800"
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="flex gap-3">
          <motion.button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-white/20 active:scale-95 transition-transform text-slate-800"
            whileTap={{ scale: 0.9 }}
          >
            <Share className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={() => {
              triggerHaptic();
              setIsLiked(!isLiked);
            }}
            className="p-2.5 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-white/20 active:scale-95 transition-transform"
            whileTap={{ scale: 0.9 }}
          >
            <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'fill-indigo-500 text-indigo-500' : 'text-slate-800'}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* --- Parallax Image Header --- */}
      <motion.div
        className="fixed top-0 left-0 w-full h-[50vh] z-0"
        style={{ opacity: imageOpacity, scale: imageScale, y: headerY }}
      >
        <MobileImageCarousel
          images={listing.all_image_urls?.map((img: any) => img.url) || []}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10 pointer-events-none" />
      </motion.div>

      {/* --- Main Content Sheet --- */}
      <div className="relative z-10 mt-[42vh] bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] min-h-screen pb-32">

        {/* Drag Handle Indicator */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="px-6 py-4 space-y-8">

          {/* Title & Basic Info */}
          <div className="space-y-4">
            <motion.h1
              className="text-2xl md:text-3xl font-bold leading-tight text-slate-900"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {listing.title}
            </motion.h1>

            <motion.div
              className="flex flex-wrap items-center gap-y-2 text-sm font-medium text-slate-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="flex items-center bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold mr-3">
                <Star className="w-3 h-3 mr-1 fill-indigo-700" />
                {listing.overall_rating || "New"}
              </span>
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                {listing.location?.city}, {listing.location?.state}
              </span>
            </motion.div>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* Description Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-3">About this space</h3>
            <div className="relative overflow-hidden transition-all duration-500 ease-in-out">
              <p className={`text-slate-600 leading-relaxed ${isDescriptionExpanded ? "" : "line-clamp-4"}`}>
                {listing.the_space}
              </p>
              {!isDescriptionExpanded && (
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
            <button
              onClick={() => {
                triggerHaptic();
                setIsDescriptionExpanded(!isDescriptionExpanded);
              }}
              className="mt-2 flex items-center text-indigo-600 font-semibold text-sm active:text-indigo-700"
            >
              {isDescriptionExpanded ? "Read less" : "Read more"}
              <ArrowLeft className={`w-4 h-4 ml-1 transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>
          </motion.div>

          <div className="h-px w-full bg-slate-100" />

          {/* Amenities Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">What this place offers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listing.included_amenities?.slice(0, 6).map((a: string, idx: number) => (
                <motion.div
                  key={a}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.05) }}
                  className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="p-1.5 bg-white rounded-full shadow-sm mr-3 text-indigo-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-slate-700 font-medium text-sm">{a}</span>
                </motion.div>
              ))}
            </div>

            {listing.included_amenities?.length > 6 && (
              <button
                onClick={() => triggerHaptic()}
                className="w-full mt-4 py-3 rounded-xl border border-slate-200 font-semibold text-slate-900 text-sm active:bg-slate-50 transition-colors"
              >
                Show all {listing.included_amenities.length} amenities
              </button>
            )}

            {/* Not Included Amenities Toggle */}
            <div className="mt-6">
              <button
                onClick={() => {
                  triggerHaptic();
                  setShowNotIncluded(!showNotIncluded);
                }}
                className="flex items-center justify-between w-full text-slate-500 text-sm font-medium group"
              >
                <span>See what's not included</span>
                <motion.span
                  animate={{ rotate: showNotIncluded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-slate-100 rounded-full p-1 group-active:bg-slate-200 transition-colors"
                >
                  <div className="w-4 h-4 flex items-center justify-center">▼</div>
                </motion.span>
              </button>
              <AnimatePresence>
                {showNotIncluded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2">
                      {listing.not_included_amenities?.map((a: string) => (
                        <div key={a} className="flex items-center p-3 rounded-xl bg-red-50/50 border border-red-100/50 opacity-75">
                          <X className="w-4 h-4 text-red-400 mr-3" />
                          <span className="text-slate-600 text-sm line-through decoration-slate-400">{a}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="h-px w-full bg-slate-100" />

          {/* Map Section */}
          {listing?.latitude && listing?.longitude && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">Where you'll be</h3>
              <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 h-56">
                <MapView
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                />
              </div>
              <div className="mt-3 flex items-start gap-2 text-slate-500 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{listing.location?.city}, {listing.location?.state}, India</p>
              </div>
            </motion.div>
          )}

          <div className="h-px w-full bg-slate-100" />

          {/* House Rules */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <HouseRules rules={listing} />
          </motion.div>

          <div className="h-px w-full bg-slate-100" />

          {/* Detailed Ratings */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <DetailedRatings ratings={listing} />
          </motion.div>

          <div className="h-px w-full bg-slate-100" />

          {/* Reviews */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Reviews ratings={listing} listingId={id} />
          </motion.div>

        </div>
      </div>

      {/* --- Booking Bar --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <BookingBar
          price={listing.price_per_night ?? 0}
          onReserveClick={() => setIsDrawerOpen(true)}
        />
      </div>

      {/* --- Drawer --- */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-white">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-2xl font-bold text-slate-900">Plan your trip</DrawerTitle>
              <DrawerDescription className="text-slate-500">Add dates and guests for accurate pricing</DrawerDescription>
            </DrawerHeader>
            <BookingDrawerContent onApply={handleApplyFromDrawer} max_guests={listing.max_guests || 1} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ListingDetailsPage;
