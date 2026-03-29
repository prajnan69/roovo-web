"use client";

import React, { useState, useEffect } from 'react';
import type { ListingData as Listing } from '@/types';
import { addRecentlyViewed } from '@/services/api';
import supabase from '@/services/api';
import Stack from './Stack';
import { IconStarFilled } from '@tabler/icons-react';
import { triggerHaptic } from '@/lib/haptics';
import { reverseGeocode } from '@/lib/googleMaps';
import { motion, AnimatePresence } from 'motion/react';

const VerifiedBadge = ({ listing }: { listing: Listing }) => {
  const [showName, setShowName] = useState(false);
  const displayName = listing.name || listing.title;
  const isLongName = displayName.length > 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowName(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="absolute top-1 left-1 z-10 custom-shadow">
        <div className="relative bg-[#FFD700] rounded-full p-0.5 shadow-[0_0_12px_rgba(255,223,0,0.7)] ring-1 ring-white/60 overflow-hidden w-6 h-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/50 to-transparent animate-pulse" />
          <img src="/verified-gold.png" alt="Verified" className="relative z-10 w-4 h-4 object-contain" />
        </div>
      </div>

      <div className="absolute bottom-2 left-4 z-10 max-w-[calc(100%-24px)]">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/20 shadow-sm h-6 overflow-hidden">
          <div className="relative h-4 min-w-[85px] max-w-full overflow-hidden flex items-center">
            <AnimatePresence mode="wait">
              {!showName ? (
                <motion.div
                  key="verified"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-[10px] font-medium text-white leading-tight drop-shadow-sm absolute inset-y-0 left-0 flex items-center"
                >
                  Roovo Verified
                </motion.div>
              ) : (
                <motion.div
                  key="name"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[10px] font-medium text-white leading-tight drop-shadow-sm absolute inset-0 flex items-center w-full"
                >
                  <div className={`whitespace-nowrap w-full ${isLongName ? 'animate-marquee' : 'truncate'}`}>
                    {displayName}
                    {isLongName && <span className="pl-4">{displayName}</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

interface ListingCardProps {
  listing: Listing;
  onImageLoad: () => void;
  size?: 'small' | 'normal';
  variant?: 'default' | 'search';
}

// --- Main ListingCard Component ---
const ListingCard: React.FC<ListingCardProps> = ({ listing, size = 'normal', variant = 'default' }) => {
  const [fetchedLocation, setFetchedLocation] = useState<string | null>(null);

  // const isGuestFavourite = listing.overall_rating && listing.overall_rating > 4.8;
  const showVerifiedBadge = !!listing.is_roovo_verified;

  // Logic to determine location display
  // 1. Try listing.place (city)
  // 2. Try listing.location.city
  // 3. Try listing.location.address
  // 4. Try fetchedLocation from reverse geocoding
  // 5. Fallback to 'Location unavailable'

  const locationFromProps = (listing as any).place || listing.location?.city || (listing.location as any)?.address;
  const displayLocation = locationFromProps || fetchedLocation || 'Location unavailable';

  useEffect(() => {
    // If we don't have a valid location from props, try to fetch it
    if (!locationFromProps && !fetchedLocation) {
      const lat = listing.latitude || (listing.location as any)?.latitude;
      const lng = listing.longitude || (listing.location as any)?.longitude;

      if (lat && lng) {
        reverseGeocode(Number(lat), Number(lng)).then(address => {
          if (address) setFetchedLocation(address);
        }).catch(err => console.error("Failed to fetch location for card", err));
      }
    }
  }, [listing, locationFromProps, fetchedLocation]);

  const images = (listing.all_image_urls || []).slice(0, size === 'small' ? 1 : 5).map((src, index) => {
    return { id: index, img: src.url };
  });

  const cardWidth = variant === 'search' ? 300 : 160;

  const navigate = (path: string) => {
    // Preserve search params if they exist
    const currentSearch = window.location.search;
    const newPath = currentSearch ? `${path}${currentSearch}` : path;

    window.history.pushState({}, '', newPath);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  };
  const handleClick = async () => {
    // Add to localStorage recently viewed
    try {
      const localHistory = localStorage.getItem('recentlyViewed');
      let history = localHistory ? JSON.parse(localHistory) : [];

      // Remove existing entry if it exists to move it to the front
      history = history.filter((item: any) => item.id !== listing.id);

      // Add current listing to the front
      history.unshift(listing);

      // Keep only last 20 items
      history = history.slice(0, 20);

      localStorage.setItem('recentlyViewed', JSON.stringify(history));
    } catch (e) {
      console.error('Error updating local recently viewed:', e);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log('[ListingCard] Session:', session?.user?.id);
    console.log('[ListingCard] Listing:', listing.id, listing.host_id);

    if (session) {
      // Only add to recently viewed if user is not the host
      if (listing.host_id && session.user.id !== listing.host_id) {
        console.log('[ListingCard] Calling addRecentlyViewed API...');
        await addRecentlyViewed(session.user.id, listing.id as any);
      } else {
        console.log('[ListingCard] Skipping session storage: user is host or host_id missing');
      }
    } else {
      console.log('[ListingCard] Skipping session storage: no active session');
    }
    navigate(`/listing/${listing.id}`);
  };

  if (variant === 'search') {
    return (
      <div onClick={handleClick} className="cursor-pointer w-full flex flex-col gap-3 group isolate">
        {/* Single Image Display */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-gray-100">
          <img
            src={images[0]?.img}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Guest Favorite Badge */}
          {showVerifiedBadge && (
            <div className="absolute top-3 left-3 z-10">
              <div className="relative bg-[#FFD700] rounded-full p-0.5 shadow-[0_0_12px_rgba(255,223,0,0.7)] ring-1 ring-white/60 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/50 to-transparent animate-pulse" />
                <img src="/verified-gold.png" alt="Verified" className="relative z-10 w-5 h-5 object-contain" />
              </div>
            </div>
          )}


          {/* Wishlist Button */}
          <button className="absolute top-1 right-1 p-2 rounded-full bg-black/10 hover:bg-white/20 backdrop-blur-md text-white transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
          </button>
        </div>

        {/* Listing Info */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-slate-900 text-base line-clamp-1">{listing.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              <IconStarFilled className="h-3.5 w-3.5 text-slate-900" />
              <span className="text-sm font-medium text-slate-900">{listing.overall_rating}</span>
            </div>
          </div>

          <p className="text-sm text-slate-500 truncate">{displayLocation}</p>

          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-semibold text-slate-900">₹{listing.price_per_night}</span>
            <span className="text-slate-500 text-sm">night</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Card container: Smaller width, flex-shrink-0 to prevent squishing
    <div onClick={handleClick} className="cursor-pointer w-40 shrink-0 isolate">
      {/* --- Image Carousel --- */}
      <div className="relative rounded-2xl aspect-square group">
        <Stack
          cardsData={images}
          cardDimensions={{ width: cardWidth, height: cardWidth }}
          onSwipe={triggerHaptic}
          showBorder={showVerifiedBadge}
          renderTopRightOverlay={() => (
            <button className="p-1 text-white bg-transparent transition-all scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 cursor-pointer drop-shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
            </button>
          )}
        />

        {showVerifiedBadge && <VerifiedBadge listing={listing} />}
      </div>

      {/* --- Listing Info --- */}
      <div className="mt-2">
        {size !== 'small' && <h3 className="font-medium text-sm text-slate-800 line-clamp-2">{listing.title}</h3>}
        <p className="text-xs text-slate-500 mt-1">{displayLocation}</p>
        <div className="text-xs text-slate-500 flex items-center space-x-1 mt-1">
          <span>
            ₹{listing.price_per_night} night
          </span>
          <span>·</span>
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-800" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <span className="font-medium">{listing.overall_rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Skeleton Card for Loading State ---
export const SkeletonCard: React.FC<{ size?: 'small' | 'normal' }> = ({ size = 'normal' }) => (
  <div className="animate-pulse w-40 shrink-0">
    <div className="bg-slate-200 rounded-2xl aspect-square"></div>
    <div className="mt-2 space-y-2">
      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
    </div>
  </div>
);

export default ListingCard;
