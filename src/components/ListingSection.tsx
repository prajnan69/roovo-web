"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import ListingCard from './ListingCard';
import { SkeletonCard } from './SkeletonCard';
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
      <div className="flex items-center justify-between mb-2 px-4 md:px-0" style={{ minHeight: '2.5rem' }}>
        {loading ? (
          <div className="h-8 bg-slate-200 rounded w-3/4 animate-pulse"></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.h2
              key={title}
              className="text-2xl font-bold text-slate-900 tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {title}
            </motion.h2>
          </AnimatePresence>
        )}
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
            ? Array.from({ length: 8 }).map((_, index) => (
              <div key={`skel-${index}`} className={size === 'small' ? 'w-40' : 'w-56'}>
                <SkeletonCard />
              </div>
            ))
            : listings.map((listing) => (
              <motion.div
                key={listing.id}
                className={size === 'small' ? 'w-40' : 'w-56'}
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