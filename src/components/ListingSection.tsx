"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import ListingCard from './ListingCard';
import ListingCardSkeleton from './ListingCardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { ListingData as Listing } from '@/types';

interface ListingSectionProps {
  title: string;
  listings: Listing[];
  loading: boolean;
  onImageLoad?: () => void;
  size?: 'small' | 'normal';
}

const ListingSection: React.FC<ListingSectionProps> = ({ title, listings, loading, onImageLoad = () => { }, size = 'normal' }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Generate a unique key for the list
  const listUniqueKey = useMemo(() => {
    return listings.map(l => l.id).join('-');
  }, [listings]);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      const isScrollable = container.scrollWidth > container.clientWidth;
      const hasScrolledToEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
      setCanScrollRight(isScrollable && !hasScrolledToEnd);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const timer = setTimeout(checkScrollability, 100);
      window.addEventListener('resize', checkScrollability);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [listings, loading]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative group" style={{ minHeight: size === 'small' ? '16rem' : '20rem' }}>
      <div className="flex items-end justify-between mb-4 px-4 md:px-0">
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-24 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
                {title.toLowerCase().includes('weekend') ? 'Weekend escapes' : title.toLowerCase().includes('new') ? 'Just added' : 'Featured'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#0A0A09', letterSpacing: '-.04em', lineHeight: 1.1, fontFamily: "'Playfair Display', Georgia, serif" }}>
                {title.split(' ').slice(0, 2).join(' ')}{' '}
                <span style={{ fontStyle: 'italic' }}>{title.split(' ').slice(2).join(' ')}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
        <button style={{ fontSize: 12, fontWeight: 600, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: 3, background: '#EEEEFF', padding: '6px 12px', borderRadius: 99, border: 'none', flexShrink: 0 }}>
          See all
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div className="relative">
        <motion.div
          ref={scrollContainerRef}
          key={loading ? 'loading' : listUniqueKey}
          onScroll={checkScrollability}
          className="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide px-4 md:px-0"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`skel-${index}`} style={{ flexShrink: 0, width: size === 'small' ? 150 : 180 }}>
                <ListingCardSkeleton size={size} />
              </div>
            ))
            : listings.map((listing) => (
              <motion.div
                key={listing.id}
                style={{ flexShrink: 0, width: size === 'small' ? 150 : 180 }}
                layout
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <ListingCard listing={listing} onImageLoad={onImageLoad} size={size} />
              </motion.div>
            ))
          }
        </motion.div>

        {/* Upcoming Property placeholders when empty */}
        {!loading && listings.length === 0 && (
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingLeft: 16, paddingRight: 16, paddingBottom: 4, scrollbarWidth: 'none' }}>
            {[
              { g: ['#1E1B4B','#3730A3','#818CF8'], name: 'Upcoming Property' },
              { g: ['#052E16','#065F46','#34D399'], name: 'Coming Soon' },
            ].map((item, i) => (
              <div key={i} style={{ flexShrink: 0, width: size === 'small' ? 150 : 180 }}>
                <div style={{
                  height: size === 'small' ? 175 : 225,
                  borderRadius: 18,
                  background: `linear-gradient(155deg,${item.g[0]} 0%,${item.g[1]} 52%,${item.g[2]} 100%)`,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Subtle radial overlays */}
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 25% 30%,rgba(255,255,255,.11) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(0,0,0,.22) 0%,transparent 55%)' }} />
                  {/* House watermark */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.07 }}>
                    <svg width="56%" height="56%" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  {/* Coming soon badge */}
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.32)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.9)', letterSpacing: '.03em' }}>
                    Coming Soon
                  </div>
                  {/* Gradient overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,0) 45%)' }} />
                  {/* Name */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: size === 'small' ? '10px 12px' : '18px 16px' }}>
                    <div style={{ fontSize: size === 'small' ? 12 : 16, fontWeight: 700, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2, fontFamily: "'Playfair Display', Georgia, serif" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 4, fontStyle: 'italic' }}>Stay tuned for new properties</div>
                  </div>
                </div>
                {/* Below card */}
                <div style={{ marginTop: 8, padding: '0 2px' }}>
                  <div style={{ fontSize: 11, color: '#888880', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#888880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Karnataka, India
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className="hidden md:block absolute left-0 top-1/2 -translate-y-full -translate-x-1/2 z-10 p-2 rounded-full bg-white shadow-lg border border-slate-200 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-default"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className="hidden md:block absolute right-0 top-1/2 -translate-y-full translate-x-1/2 z-10 p-2 rounded-full bg-white shadow-lg border border-slate-200 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-default"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default ListingSection;