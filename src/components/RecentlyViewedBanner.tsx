"use client";

import React from 'react';
import type { ListingData as Listing } from '@/types';
import { motion } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import { triggerHaptic } from '@/lib/haptics';
import { resolveImageUrl } from '@/utils/imageUtils';

interface RecentlyViewedBannerProps {
  listings: Listing[];
}

// Gradient palettes for fallback (matches prototype VBG)
const GRADIENTS = [
  ['#1E1B4B', '#3730A3', '#818CF8'],
  ['#052E16', '#065F46', '#34D399'],
  ['#0C1445', '#1D4ED8', '#93C5FD'],
  ['#2E1065', '#7C3AED', '#C4B5FD'],
  ['#451A03', '#B45309', '#FCD34D'],
  ['#052E16', '#15803D', '#86EFAC'],
];

const RecentlyViewedBanner: React.FC<RecentlyViewedBannerProps> = ({ listings }) => {
  const { navigate } = useNavigation();
  const listingsToShow = listings.slice(0, 6);

  if (listingsToShow.length === 0) return null;

  return (
    <div style={{ padding: '4px 0 20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh icon */}
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: '#F4F3F0', border: '1px solid rgba(0,0,0,0.065)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0A09', letterSpacing: '-.02em' }}>Recently viewed</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#888880' }}>
          {listingsToShow.length} stay{listingsToShow.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px' }}>
        {listingsToShow.map((listing, index) => {
          const g = GRADIENTS[index % GRADIENTS.length];
          const imageUrl = (() => {
            const imgs = listing.all_image_urls;
            if (!imgs || imgs.length === 0) return null;
            const first = imgs[0];
            const raw = typeof first === 'string' ? first : first?.url;
            return resolveImageUrl(raw);
          })();

          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              onClick={() => { triggerHaptic(); navigate(`/listing/${listing.id}`); }}
              style={{ cursor: 'pointer' }}
            >
              {/* Card image / gradient */}
              <div style={{
                height: 130,
                borderRadius: 18,
                overflow: 'hidden',
                position: 'relative',
                background: `linear-gradient(155deg,${g[0]} 0%,${g[1]} 52%,${g[2]} 100%)`,
              }}>
                {/* Real image if available */}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={listing.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {/* House watermark (shows through when no image) */}
                {!imageUrl && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.10 }}>
                    <svg width="52%" height="52%" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                )}
                {/* Gradient overlay at bottom */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 50%)' }} />
              </div>

              {/* Below card: location + price */}
              <div style={{ marginTop: 7, padding: '0 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#888880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#888880', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {listing.city || listing.place || 'Karnataka'}
                  </span>
                </div>
                {listing.price_per_night && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0A0A09', flexShrink: 0 }}>
                    ₹{listing.price_per_night.toLocaleString()}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyViewedBanner;
