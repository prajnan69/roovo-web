"use client";

import React, { useState, useEffect } from 'react';
import type { ListingData as Listing } from '@/types';
import { addRecentlyViewed } from '@/services/api';
import supabase from '@/services/api';
import Stack from './Stack';
import { IconStarFilled } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';

interface ListingCardProps {
  listing: Listing;
  onImageLoad: () => void;
  size?: 'small' | 'normal';
  variant?: 'default' | 'search';
}

// --- Main ListingCard Component ---
const ListingCard: React.FC<ListingCardProps> = ({ listing, size = 'normal', variant = 'default' }) => {
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const isGuestFavourite = listing.overall_rating && listing.overall_rating > 4.8;
  const displayLocation = listing.location?.city || 'Location unavailable';
  const images = (listing.all_image_urls || []).slice(0, size === 'small' ? 1 : 5).map((src, index) => {
    return { id: index, img: src.url };
  });

  const cardWidth = variant === 'search' ? 300 : 160;

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  };

  const handleClick = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await addRecentlyViewed(session.user.id, String(listing.id));
    }
    navigate(`/listing/${listing.id}`);
  };

  if (variant === 'search') {
    return (
      <div onClick={handleClick} className="cursor-pointer w-full flex flex-col gap-3 group isolate">
        {/* Single Image Display */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
           <img
             src={images[0]?.img}
             alt={listing.title}
             className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
             loading="lazy"
           />
           
           {/* Guest Favorite Badge */}
           {isGuestFavourite && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <IconStarFilled className="h-3 w-3 text-rose-500" />
              <span className="text-xs font-semibold text-slate-900">Guest favorite</span>
            </div>
           )}

           {/* Wishlist Button */}
           <button className="absolute top-3 right-3 p-2 rounded-full bg-black/10 hover:bg-white/20 backdrop-blur-md text-white transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
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
    <div onClick={handleClick} className="cursor-pointer w-40 flex-shrink-0 isolate">
      {/* --- Image Carousel --- */}
      <div className="relative rounded-2xl aspect-square group">
        <Stack cardsData={images} cardDimensions={{ width: cardWidth, height: cardWidth }} onSwipe={triggerHaptic} />
        
        {/* "Guest favourite" Badge */}
        {isGuestFavourite && (
          <div 
            className="absolute top-2 left-2 z-10 bg-white rounded-full p-1"
            onMouseEnter={() => setIsBadgeHovered(true)}
            onMouseLeave={() => setIsBadgeHovered(false)}
          >
            <div className="relative flex items-center">
              <IconStarFilled className="h-3 w-3 text-black" />
              <AnimatePresence>
                {isBadgeHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-full ml-2 px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-bold shadow-lg whitespace-nowrap"
                  >
                    Guest favourite
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {/* Wishlist Button */}
        <button className="absolute top-3 right-3 z-10 p-2 text-white transition-all scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
        </button>
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
  <div className="animate-pulse w-40 flex-shrink-0">
    <div className="bg-slate-200 rounded-2xl aspect-square"></div>
    <div className="mt-2 space-y-2">
      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
    </div>
  </div>
);

export default ListingCard;
