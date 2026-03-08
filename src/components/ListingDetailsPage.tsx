"use client";

import { useEffect, useState, useRef } from "react";
import { useScroll, useTransform } from "framer-motion";
import { Share as CapShare } from '@capacitor/share';
import RoovoLoader from "@/components/RoovoLoader";
import { fetchListingById, addRecentlyViewed, fetchBookingsByListingId } from "@/services/api";
import supabase from "../services/api";
import ConfirmAndPay from "@/components/ConfirmAndPay";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import BookingDrawerContent from "@/components/BookingDrawerContent";
import BookingBar from "@/components/BookingBar";
import DetailedRatings from "@/components/DetailedRatings";
import Reviews from "@/components/Reviews";
import { triggerHaptic } from "@/lib/haptics";
import ChatDrawer from "@/components/ChatDrawer";
import { reverseGeocode } from "@/lib/googleMaps";
import Toast from "@/components/ui/toast";
import { getRandomHostSelfReservationMessage } from "@/utils/wittyMessages";
import dayjs from "dayjs";

// Extracted Components
import ListingHeader from "@/components/listing-details/ListingHeader";
import ListingHero from "@/components/listing-details/ListingHero";
import ListingTitleSection from "@/components/listing-details/ListingTitleSection";
import ListingStats from "@/components/listing-details/ListingStats";
import ListingHostInfo from "@/components/listing-details/ListingHostInfo";
import ListingDescription from "@/components/listing-details/ListingDescription";
import ListingVideoTour from "@/components/listing-details/ListingVideoTour";
import ListingAmenities from "@/components/listing-details/ListingAmenities";
import ListingHouseRules from "@/components/listing-details/ListingHouseRules";
import ListingMap from "@/components/listing-details/ListingMap";
import GiftBoxAnimation from "@/components/animations/GiftBoxAnimation";

const ListingDetailsPage = ({ match, onOpenChat, onOpenLogin }: { match: any, onOpenChat?: (conversation: any) => void, onOpenLogin?: (subtitle?: string) => void }) => {
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const id = match[1];

  useEffect(() => {
    const loadListingData = async () => {
      try {
        const [listingData, bookingData] = await Promise.all([
          fetchListingById(id),
          fetchBookingsByListingId(id)
        ]);

        const data = listingData;
        setBookings(bookingData || []);

        // Host Data Mapping
        const rawHost = data.host || {};
        const hostData = {
          name: rawHost.name || "Host",
          image: rawHost.profilePictureUrl || null,
          about: rawHost.about || "",
          is_superhost: rawHost.isSuperhost || false,
          years_hosting: rawHost.timeAsHost?.years || 0,
          months_hosting: rawHost.timeAsHost?.months || 0,
          rating_count: rawHost.ratingCount || 0,
          rating_average: rawHost.ratingAverage || 0,
          response_rate: rawHost.hostDetails?.find((d: string) => d.includes("Response rate")) || null,
          response_time: rawHost.hostDetails?.find((d: string) => d.includes("Responds")) || null,
          work: rawHost.profession || null,
        };

        // --- LOCATION MAPPING ---
        let placeText = data.place || data.public_address;
        if ((!placeText || placeText === "Beautiful Stay") && (data.fuzzy_lat || data.exact_lat) && (data.fuzzy_lng || data.exact_lng)) {
          const lat = data.fuzzy_lat || data.exact_lat;
          const lng = data.fuzzy_lng || data.exact_lng;
          try {
            const address = await reverseGeocode(parseFloat(lat), parseFloat(lng));
            if (address) placeText = address;
          } catch (err) {
            console.error("Failed to reverse geocode", err);
          }
        }
        if (!placeText) placeText = "Beautiful Stay";

        // Resolve Video URL
        let videoTourUrl = data.legal_data?.videoHomeTour?.url;
        if (videoTourUrl && !videoTourUrl.startsWith('http')) {
          const { data: publicUrlData } = supabase.storage
            .from('verification-videos')
            .getPublicUrl(videoTourUrl);
          videoTourUrl = publicUrlData.publicUrl;
        }

        const groupAmenities = (rawAmenities: any[]) => {
          if (!Array.isArray(rawAmenities)) return [];
          // If already grouped (legacy support), return as is
          if (rawAmenities.length > 0 && rawAmenities[0].category && rawAmenities[0].items) {
            return rawAmenities;
          }

          const groups: Record<string, any[]> = {};
          rawAmenities.forEach((item: any) => {
            if (item.available) {
              const group = item.groupName || "Other";
              if (!groups[group]) groups[group] = [];
              groups[group].push(item);
            }
          });

          return Object.entries(groups).map(([category, items]) => ({
            category,
            items
          }));
        };

        const mappedListing = {
          ...data,
          place: placeText,
          video_tour_url: videoTourUrl,
          all_image_urls: data.images_data || [],
          primary_image_url: data.images_data?.[0]?.url || null,
          amenities_sections: groupAmenities(data.amenities_data || []),
          max_guests: data.max_guests,
          total_bedrooms: data.total_bedrooms,
          total_bathrooms: data.total_bathrooms,
          property_type: data.property_type,
          overall_rating: data.ratings_data?.value || 0,
          cleanliness_rating: data.ratings_data?.cleanliness || 0,
          accuracy_rating: data.ratings_data?.accuracy || 0,
          checkin_rating: data.ratings_data?.checkin || 0,
          communication_rating: data.ratings_data?.communication || 0,
          location_rating: data.ratings_data?.location || 0,
          price_per_night: data.base_price_weekday,
          the_space: data.description,
          host_data: hostData,
          house_rules: data.house_rules || [],
          latitude: data.fuzzy_lat || data.exact_lat,
          longitude: data.fuzzy_lng || data.exact_lng,
          location: { address: data.public_address || 'Detailed address provided after booking' }
        };

        setListing(mappedListing);

      } catch (e) {
        console.error("Error fetching:", e);
      } finally {
        setLoading(false);
      }
    };
    loadListingData();

    // Record Recently Viewed
    const recordView = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id && id && listing?.host_id) {
        if (session.user.id !== listing.host_id) {
          addRecentlyViewed(session.user.id, id);
        }
      }
    };
    if (listing) recordView();
  }, [id, listing?.host_id]); // Added listing dependency for recordView

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <RoovoLoader />
      </div>
    );
  }
  if (!listing) return <div className="p-4 text-center">Listing not found</div>;

  return <ListingContent listing={listing} setListing={setListing} id={id} bookings={bookings} onOpenChat={onOpenChat} onOpenLogin={onOpenLogin} />;
};

// Sub-component that handles the scrolling view and UI interaction
const ListingContent = ({ listing, setListing, id, bookings, onOpenChat, onOpenLogin }: { listing: any, setListing: any, id: string, bookings: any[], onOpenChat?: (c: any) => void, onOpenLogin?: (subtitle?: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });

  const imageOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const imageScale = useTransform(scrollY, [0, 300], [1, 1.08]);
  const headerBgOpacity = useTransform(scrollY, [200, 280], [0, 1]);
  const headerTextColor = useTransform(scrollY, [200, 280], ["#ffffff", "#000000"]);
  // Corrected "transparent" reference to rgba for motion compatibility
  const headerIconBg = useTransform(scrollY, [200, 280], ["rgba(255,255,255,0.2)", "rgba(255,255,255,0)"]);

  // UI State
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showConfirmAndPay, setShowConfirmAndPay] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatIntent, setChatIntent] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('User');
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Booking State
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  const [showPrice, setShowPrice] = useState(false);
  const [buttonText, setButtonText] = useState("Check availability");
  const [showChat, setShowChat] = useState(false);

  // Airbnb State
  const [airbnbPrice, setAirbnbPrice] = useState<number | null>(null);
  const [airbnbTotal, setAirbnbTotal] = useState<number | null>(null);
  const [loadingAirbnbPrice, setLoadingAirbnbPrice] = useState(false);
  const [airbnbAvailable, setAirbnbAvailable] = useState<boolean>(true);
  const [nightsCount, setNightsCount] = useState<number>(1);

  // Loyalty Discount State
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [isFeeWaived, setIsFeeWaived] = useState<boolean>(false);
  const [showGiftBox, setShowGiftBox] = useState<boolean>(false);
  // Verification
  const [isHostKycVerified, setIsHostKycVerified] = useState(false);
  const [isRoovoVerified, setIsRoovoVerified] = useState(false);

  useEffect(() => {
    // Check for search params
    const params = new URLSearchParams(window.location.search);
    const checkIn = params.get('checkIn');
    const checkOut = params.get('checkOut');
    const guests = params.get('guests') ? parseInt(params.get('guests')!) : 1;

    if (checkIn && checkOut && listing) {
      const fromDate = dayjs(checkIn);
      const toDate = dayjs(checkOut);
      const nights = toDate.diff(fromDate, 'day');

      if (nights > 0) {
        const pricePerNight = Number(listing.price_per_night) || 0;
        const totalPrice = pricePerNight * nights;

        setBookingDetails({
          startDate: fromDate.format('YYYY-MM-DD'),
          endDate: toDate.format('YYYY-MM-DD'),
          guests: guests,
          nights: nights,
        });
        setPriceDetails({
          pricePerNight: pricePerNight,
          totalPrice: totalPrice,
          taxes: totalPrice * 0.18,
        });
        setShowPrice(true);
        setButtonText("Reserve");
        setShowChat(true);
      }
    }
  }, [listing]); // Run when listing is available

  useEffect(() => {
    // Fetch Host extra info (KYC & Subscription)
    const fetchHostExtras = async () => {
      if (listing?.host_id) {
        const { data: kycRow } = await supabase
          .from("kyc")
          .select("id")
          .eq("host_id", listing.host_id)
          .maybeSingle();
        setIsHostKycVerified(!!kycRow);

        // Use the value from the listing data directly
        setIsRoovoVerified(!!listing.is_roovo_verified);
      }
    };
    fetchHostExtras();

    // Get user session data
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${session.user.id}`);
          if (response.ok) {
            const { data } = await response.json();
            setCurrentUserName(data?.name || 'User');
            setCurrentUserPhone(data?.phone || '');

            // Fetch booking count
            const countResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/count/${session.user.id}`);
            if (countResponse.ok) {
              const { count } = await countResponse.json();
              setBookingCount(count);
              // If count >= 3, fee is already waived by default (users only pay it for first 3)
              // Actually user said: "it this gift box should come only for 3 bookings per user"
              // Initially the price should include this 3% till the user clicks it.
              if (count >= 3) {
                setIsFeeWaived(true);
              }
            }
          }
        } catch (e) {
          console.error('Error fetching user data:', e);
        }
      }
    };
    getUserData();
  }, [listing]);

  // Dedicated Effect for Airbnb Price - Triggers only when listing ID and dates are ready
  useEffect(() => {
    if (listing?.airbnb_listing_id && bookingDetails?.startDate && bookingDetails?.endDate) {
      const from = new Date(bookingDetails.startDate);
      const to = new Date(bookingDetails.endDate);
      checkAirbnbPrice(from, to, bookingDetails.guests);
    }
  }, [listing?.airbnb_listing_id, bookingDetails?.startDate, bookingDetails?.endDate]);

  // Airbnb Price Check
  const checkAirbnbPrice = async (checkIn?: Date, checkOut?: Date, guests?: number) => {
    if (!listing?.airbnb_listing_id || !checkIn || !checkOut) return;

    // Prevent multiple concurrent scrapings
    if (loadingAirbnbPrice) {
      console.log('[checkAirbnbPrice] Already fetching, skipping...');
      return;
    }

    setLoadingAirbnbPrice(true);
    setAirbnbAvailable(true);
    try {
      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const requestBody = {
        listing_id: id, // Pass Roovo's listing ID
        airbnb_roomid: listing.airbnb_listing_id,
        checkIn: formatDateLocal(checkIn),
        checkOut: formatDateLocal(checkOut),
        guests: guests || 1,
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/airbnb/compare-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;

        if (data.is_available) {
          setAirbnbTotal(data.airbnb_total);
          setAirbnbPrice(data.airbnb_per_night);
          setNightsCount(data.nights);

          // If the price was adjusted in the backend, update Roovo's state to match
          if (data.price_adjusted && data.matched_price) {
            console.log(`[checkAirbnbPrice] Roovo price matched to ${data.matched_price}`);

            // Update listing state
            setListing((prev: any) => ({
              ...prev,
              price_per_night: data.matched_price
            }));

            // Update price details state
            setPriceDetails((prev: any) => {
              if (!prev) return null;
              const newTotal = data.matched_price * data.nights;
              return {
                ...prev,
                pricePerNight: data.matched_price,
                totalPrice: newTotal,
                taxes: newTotal * 0.18
              };
            });
          }
        } else {
          setAirbnbAvailable(false);
        }

        // Show gift box if eligible (first 3 bookings) and fee not yet waived
        if (bookingCount < 3 && !isFeeWaived) {
          setShowGiftBox(true);
        }
      }
    } catch (error) {
      console.error("Error checking Airbnb price:", error);
    } finally {
      setLoadingAirbnbPrice(false);
    }
  };

  const handleReserveClick = () => {
    if (bookingDetails && priceDetails && showPrice) {
      if (!currentUserId) {
        onOpenLogin?.("Login to secure your stay!");
        return;
      }
      if (listing?.host_id && currentUserId === listing.host_id) {
        const wittyMessage = getRandomHostSelfReservationMessage();
        setToastMessage(wittyMessage);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }
      setShowConfirmAndPay(true);
    } else {
      setIsDrawerOpen(true);
    }
  };

  const handleDrawerChange = (dateRange: any, guests: number) => {
    const from = dateRange?.from || dateRange?.checkIn;
    const to = dateRange?.to || dateRange?.checkOut;

    if (from && to && listing) {
      const dFrom = dayjs(from);
      const dTo = dayjs(to);
      const nights = dTo.diff(dFrom, 'day');

      if (nights <= 0) {
        setShowPrice(false);
        setButtonText("Check availability");
        return;
      }

      const pricePerNight = Number(listing.price_per_night) || 0;
      const totalPrice = pricePerNight * nights;

      setBookingDetails({
        startDate: dFrom.format('YYYY-MM-DD'),
        endDate: dTo.format('YYYY-MM-DD'),
        guests: guests,
        nights: nights,
      });
      setPriceDetails({
        pricePerNight: pricePerNight,
        totalPrice: totalPrice,
        taxes: totalPrice * 0.18,
      });
      setShowPrice(true);
      setButtonText("Reserve");
      setShowChat(true);
      checkAirbnbPrice(dFrom.toDate(), dTo.toDate(), guests);
    } else {
      setBookingDetails({
        startDate: from ? dayjs(from).format('YYYY-MM-DD') : null,
        endDate: to ? dayjs(to).format('YYYY-MM-DD') : null,
        guests: guests,
        nights: 0,
      });
      setShowPrice(false);
      setButtonText("Check availability");
      setPriceDetails(null);
    }
  };

  const handleApplyFromDrawer = (dateRange: any, guests: number) => {
    const from = dateRange?.from || dateRange?.checkIn;
    const to = dateRange?.to || dateRange?.checkOut;

    if (from && to && listing) {
      const dFrom = dayjs(from);
      const dTo = dayjs(to);
      const nights = dTo.diff(dFrom, 'day');

      const pricePerNight = Number(listing.price_per_night) || 0;
      const totalPrice = pricePerNight * nights;

      setBookingDetails({
        startDate: dFrom.format('YYYY-MM-DD'),
        endDate: dTo.format('YYYY-MM-DD'),
        guests: guests,
        nights: nights,
      });
      setPriceDetails({
        pricePerNight: pricePerNight,
        totalPrice: totalPrice,
        taxes: totalPrice * 0.18,
      });
      setShowPrice(true);
      setButtonText("Reserve");
      setShowChat(true);
      checkAirbnbPrice(dFrom.toDate(), dTo.toDate(), guests);

      setIsDrawerOpen(false);

      if (chatIntent) {
        setChatIntent(false);
        setTimeout(() => {
          handleChat();
        }, 100);
      }
    }
  };

  const handleShare = async () => {
    triggerHaptic();
    await CapShare.share({
      title: listing.title,
      text: `Check out this stay: ${listing.title}`,
      url: `https://roovo.in/listing/${listing.id}`,
    });
  };

  const handleChat = async () => {
    triggerHaptic();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          guest_id: session.user.id,
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        const messagesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/messages/${conversation.id}`);

        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          if (messages && messages.length > 0) {
            if (onOpenChat) onOpenChat(conversation);
          } else {
            setIsChatDrawerOpen(true);
          }
        } else {
          setIsChatDrawerOpen(true);
        }
      } else {
        setIsChatDrawerOpen(true);
      }
    } catch (error) {
      console.error("Error checking conversation:", error);
      setIsChatDrawerOpen(true);
    }
  };

  const handleChatRequest = () => {
    if (bookingDetails?.startDate && bookingDetails?.endDate) {
      handleChat();
    } else {
      setChatIntent(true);
      setIsDrawerOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative bg-white text-slate-900 h-screen w-full overflow-y-auto overflow-x-hidden pb-28">

      <ListingHeader
        headerBgOpacity={headerBgOpacity}
        headerIconBg={headerIconBg}
        headerTextColor={headerTextColor}
        isLiked={isLiked}
        onLike={() => setIsLiked(!isLiked)}
        onShare={handleShare}
        onBack={() => window.history.back()}
        listingName={listing.name || listing.title}
        isRoovoVerified={isRoovoVerified}
      />

      <ListingHero
        imageOpacity={imageOpacity}
        imageScale={imageScale}
        images={listing.all_image_urls?.map((img: any) => img.url)}
        isRoovoVerified={isRoovoVerified}
      />

      {/* --- Content Sheet --- */}
      <div className="relative z-10 mt-[45vh] bg-white rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] min-h-screen">
        <div className="w-full flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <ListingTitleSection
            title={listing.title}
            place={listing.place}
            rating={listing.overall_rating}
          />

          <ListingStats
            maxGuests={listing.max_guests}
            bedrooms={listing.total_bedrooms}
            bathrooms={listing.total_bathrooms}
            propertyType={listing.property_type}
          />

          <ListingHostInfo
            hostData={listing.host_data}
            isHostKycVerified={isHostKycVerified}
            isRoovoVerified={isRoovoVerified}
          />

          <div className="my-10" />

          <ListingDescription
            description={listing.the_space}
            isExpanded={isDescriptionExpanded}
            onToggle={() => {
              triggerHaptic();
              setIsDescriptionExpanded(!isDescriptionExpanded);
            }}
          />

          <div className="h-px w-full bg-slate-100 mb-8" />

          <ListingVideoTour
            videoUrl={listing.video_tour_url}
            posterUrl={listing.primary_image_url}
          />

          {/* Unique Features Section */}
          {(() => {
            const locationFeatures = listing.amenities_sections?.find((s: any) =>
              s.category === 'Location features' || s.groupName === 'Location features'
            );

            if (locationFeatures && locationFeatures.items?.length > 0) {
              return (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Unique Features</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {locationFeatures.items.map((item: any, idx: number) => {
                      const title = typeof item === 'string' ? item : item.title;
                      const subTitle = typeof item === 'object' ? item.subTitle : "";

                      return (
                        <div key={idx} className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                          <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{title}</h3>
                            {subTitle && <p className="text-sm text-slate-600 mt-0.5">{subTitle}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-px w-full bg-slate-100 mt-8" />
                </div>
              );
            }
            return null;
          })()}

          <ListingAmenities
            amenitiesSections={listing.amenities_sections?.filter((s: any) =>
              s.category !== 'Location features' && s.groupName !== 'Location features'
            ) || []}
            showAll={showAllAmenities}
            onToggle={() => {
              triggerHaptic();
              setShowAllAmenities(!showAllAmenities);
            }}
            totalAmenitiesCount={listing.amenities_sections?.reduce((acc: number, sec: any) => acc + sec.items.length, 0)}
          />

          <div className="h-px w-full bg-slate-100 mb-8" />

          <ListingHouseRules rules={listing.house_rules} />

          <div className="h-px w-full bg-slate-100 mb-8" />

          <ListingMap
            place={listing.place}
            latitude={listing.fuzzy_lat || listing.latitude}
            longitude={listing.fuzzy_lng || listing.longitude}
          />

          <div className="h-px w-full bg-slate-100 mb-8" />

          <div className="space-y-8">
            <DetailedRatings ratings={listing} />
            <div className="h-px w-full bg-slate-100" />

            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-lg text-slate-900">Any more questions?</h3>
              <button
                onClick={handleChatRequest}
                className="w-full py-3.5 border-2 border-slate-900 rounded-xl font-bold text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Chat with Host
              </button>
            </div>

            <div className="h-px w-full bg-slate-100" />
            <Reviews ratings={listing} listingId={id} />
          </div>

        </div>
      </div>

      {/* --- Sticky Booking Bar --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <BookingBar
          price={listing.price_per_night ?? 0}
          onReserveClick={handleReserveClick}
          onChatClick={handleChat}
          airbnbPrice={airbnbPrice}
          airbnbTotal={airbnbTotal}
          nights={nightsCount}
          loadingAirbnbPrice={loadingAirbnbPrice}
          airbnbAvailable={airbnbAvailable}
          showPrice={showPrice && (!isDrawerOpen || !!bookingDetails)}
          totalPrice={priceDetails?.totalPrice}
          buttonText={buttonText}
          showChat={showChat}
          isFeeWaived={isFeeWaived}
          userId={currentUserId}
          userName={currentUserName}
          userPhone={currentUserPhone}
          listingId={id}
          listingTitle={listing.title}
        />
      </div>

      {showGiftBox && (
        <GiftBoxAnimation
          onComplete={() => {
            setIsFeeWaived(true);
            setShowGiftBox(false);
          }}
        />
      )}

      <Drawer open={isDrawerOpen || showConfirmAndPay} onOpenChange={(open) => {
        if (!open) {
          setIsDrawerOpen(false);
          setShowConfirmAndPay(false);
          setChatIntent(false);
        }
      }}>
        <DrawerContent className={`bg-white rounded-t-[2rem] ${showConfirmAndPay ? 'h-[92vh]' : ''}`}>
          {showConfirmAndPay && bookingDetails && priceDetails ? (
            <ConfirmAndPay
              listing={{
                id: String(listing.id),
                title: listing.title,
                primary_image_url: listing.primary_image_url ?? "",
                overall_rating: listing.overall_rating ?? 0,
                total_reviews: listing.total_reviews ?? 0,
                cancellation_policy: listing.cancellation_policy ?? "Free cancellation for 48 hours.",
              }}
              bookingDetails={bookingDetails}
              priceDetails={priceDetails}
              onBack={() => {
                setShowConfirmAndPay(false);
                setIsDrawerOpen(true);
              }}
              host_id={listing.host_id}
              auto_bookable={listing.is_auto_bookable}
              isFeeWaived={isFeeWaived}
              guestDetails={{
                id: currentUserId,
                name: currentUserName,
                phone: currentUserPhone,
              }}
            />
          ) : (
            <div className="mx-auto w-full max-w-md pb-6">
              <DrawerHeader>
                <DrawerTitle className="text-xl font-bold text-slate-900">Select Dates</DrawerTitle>
                <DrawerDescription className="text-slate-500">Add dates for exact pricing</DrawerDescription>
              </DrawerHeader>
              <div className="px-4">
                <BookingDrawerContent
                  onApply={handleApplyFromDrawer}
                  onChange={handleDrawerChange}
                  initialDates={{
                    checkIn: bookingDetails?.startDate ? new Date(bookingDetails.startDate) : null,
                    checkOut: bookingDetails?.endDate ? new Date(bookingDetails.endDate) : null
                  }}
                  initialGuests={bookingDetails?.guests || 1}
                  max_guests={listing.max_guests || 4}
                  pricePerNight={listing.price_per_night}
                  bookings={bookings}
                />
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
        hostName={listing.host_data?.name || 'Host'}
        userId={currentUserId}
        userName={currentUserName}
        userPhone={currentUserPhone}
      />

      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

    </div>
  );
};

export default ListingDetailsPage;
