"use client";

import React from 'react';
import type { ListingData as Listing } from '@/types';
import { motion } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import { triggerHaptic } from '@/lib/haptics';

interface RecentlyViewedBannerProps {
  listings: Listing[];
}

const RecentlyViewedBanner: React.FC<RecentlyViewedBannerProps> = ({ listings }) => {
  const { navigate } = useNavigation();
  const listingsToShow = listings.slice(0, 8); // Show more items since it's scrollable

  if (listingsToShow.length === 0) return null;

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between px-5 mb-2">
        <h3 className="font-bold text-lg text-slate-900">Continue searching</h3>
      </div>

      <div className="flex overflow-x-auto space-x-4 px-5 pb-2 scrollbar-hide snap-x snap-mandatory">
        {listingsToShow.map((listing, index) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              triggerHaptic();
              navigate(`/listing/${listing.id}`);
            }}
            className="flex-shrink-0 w-28 snap-start cursor-pointer"
          >
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm border border-slate-100 mb-2">
              <img
                src={listing.all_image_urls?.[0]?.url}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="font-medium text-sm text-slate-900 truncate">{listing.title}</h4>

          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewedBanner;
