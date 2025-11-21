"use client";

import React, { useEffect, useState } from 'react';
import ListingSection from './ListingSection';
import { API_BASE_URL } from '@/services/api';
import MobileSearchBar from './MobileSearchBar';
import type { ListingData as Listing } from '@/types';
import supabase from '@/services/api';
import { triggerHaptic } from '@/lib/haptics';
import { getCachedListings, setCachedListings } from '@/services/cache';
import { useBottomNavBar } from '@/context/BottomNavBarContext';
import RecentlyViewedBanner from './RecentlyViewedBanner';
import FilterChips from './FilterChips';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import RoovoLogo from './RoovoLogo';
import RoovoLoader from './RoovoLoader';
import { getRandomQuote } from '@/data/travelQuotes';

const HomeFeed: React.FC<{ onSwitchToHost?: () => void; showBottomNavBar?: boolean }> = ({
  showBottomNavBar,
}) => {
  const { setIsNavBarVisible } = useBottomNavBar();
  const [listings, setListings] = useState<Listing[]>(() => getCachedListings() || []);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [headerState, setHeaderState] = useState<'greeting' | 'hidden'>('greeting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popularTitle, setPopularTitle] = useState('Popular homes in Karnataka');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quote, setQuote] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isFiltering, setIsFiltering] = useState(false);

  const handleFilterChange = (newFilter: string) => {
    if (newFilter === activeFilter) return;
    setIsFiltering(true);
    setActiveFilter(newFilter);
    triggerHaptic();
    setTimeout(() => {
      setIsFiltering(false);
    }, 500);
  };

  const getDynamicTitle = (filter: string, location: string) => {
    switch (filter) {
      case '1bhk': return `Popular 1BHK in ${location}`;
      case '2bhk': return `Popular 2BHK in ${location}`;
      case 'pet_friendly': return `Popular Pet Friendly homes in ${location}`;
      case 'party_friendly': return `Popular Party Friendly homes in ${location}`;
      case 'self_check_in': return `Popular Self Check-in homes in ${location}`;
      case 'discounted': return `Popular Discounted homes in ${location}`;
      default: return `Popular homes in ${location}`;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Ensure slices do not overlap to minimize duplicate IDs
  const popularHomes = filteredListings.slice(0, 8);
  const weekendHomes = filteredListings.slice(8, 16);
  const newHomes = listings.slice(4, 12);

  const fetchListings = async (city?: string, forceRefresh = false) => {
    setError(null);
    setLoading(true);

    let listingsToProcess: Listing[] = [];
    const cachedListings = getCachedListings();

    // If we have cached data and no force refresh, use it immediately but keep loading true
    // so we can do the "smooth entry" visual logic
    if (cachedListings && !forceRefresh) {
      listingsToProcess = cachedListings;
      setListings(cachedListings);
      setFilteredListings(cachedListings);
    } else {
      try {
        const url = city ? `${API_BASE_URL}/api/listings?city=${city}` : `${API_BASE_URL}/api/listings`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }
        const data = await response.json();
        const listingsWithExtras = (data.data || []).map((listing: Listing) => ({
          ...listing,
          rating: listing.overall_rating || (Math.random() * (5.0 - 4.2) + 4.2).toFixed(1),
        }));

        listingsToProcess = listingsWithExtras;
        setListings(listingsWithExtras);
        setFilteredListings(listingsWithExtras);
        setCachedListings(listingsWithExtras);

        if (city && listingsWithExtras.length > 0) {
          setPopularTitle(`Popular homes in ${city}`);
        } else {
          setPopularTitle('Popular homes in Karnataka');
        }
      } catch (error) {
        console.error("Error fetching listings:", error);
        setError("We couldn't load the listings. Please try again later.");
        // If error, we stop loading after a bit so user sees the error
        setTimeout(() => setLoading(false), 1000);
        return;
      }
    }

    // Now run the visual preloading logic on whatever data we have (cached or fresh)
    try {
      // Preload critical images (first 3 images of first 8 listings) for smoother stack rendering
      const criticalImages = listingsToProcess.slice(0, 8).flatMap((l: Listing) =>
        (l.all_image_urls || []).slice(0, 3).map((img: any) => img.url)
      ).filter(Boolean);

      const preloadImages = Promise.all(criticalImages.map((url: string) => new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = resolve;
        img.onerror = resolve; // Resolve on error too so we don't block
      })));

      const timeout = new Promise((resolve) => setTimeout(resolve, 6000)); // 6s max wait for more images

      await Promise.race([preloadImages, timeout]);

    } catch (e) {
      console.warn("Preloading error", e);
    } finally {
      // Extended buffer to 2.5s to ensure background rendering is complete and animation is smooth
      setTimeout(() => {
        setLoading(false);
      }, 2500);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setHeaderState('hidden'), 5000);

    const handleScroll = () => {
      if (window.scrollY > 10) {
        setHeaderState('hidden');
      } else {
        setHeaderState('greeting');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setQuote(getRandomQuote());
    fetchListings();

    const fetchUserDataAndHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let combinedRecentlyViewed: Listing[] = [];

      if (session) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/recently-viewed/${session.user.id}`);
          const data = await response.json();
          if (Array.isArray(data)) {
            combinedRecentlyViewed.push(...data.map((item: any) => item.listings));
          }
        } catch (error) {
          console.error('Error fetching recently viewed listings from DB:', error);
        }
      }

      try {
        const localHistory = localStorage.getItem('recentlyViewed');
        if (localHistory) {
          combinedRecentlyViewed.push(...JSON.parse(localHistory));
        }
      } catch (error) {
        console.error('Error fetching recently viewed listings from localStorage:', error);
      }

      const uniqueRecentlyViewed = Array.from(new Map(combinedRecentlyViewed.reverse().map(item => [item.id, item])).values());
      setRecentlyViewed(uniqueRecentlyViewed);
    };

    fetchUserDataAndHistory();
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      if (activeFilter === 'all') {
        setFilteredListings(listings);
      } else {
        const filtered = listings.filter(listing => {
          if (activeFilter === '1bhk') return listing.total_beds === 1;
          if (activeFilter === '2bhk') return listing.total_beds === 2;
          if (activeFilter === 'pet_friendly') return listing.pets_allowed;
          if (activeFilter === 'party_friendly') return listing.party_allowed;
          if (activeFilter === 'self_check_in') return listing.self_check_in;
          if (activeFilter === 'discounted') return listing.discounted;
          return false;
        });
        setFilteredListings(filtered);
      }
    };
    applyFilters();
  }, [activeFilter, listings]);

  const renderContent = () => {
    // Loading is now handled by the full-screen overlay in the main return
    // We let the content render behind it (or return null if strictly empty, but empty arrays handle themselves)

    if (error) {
      return (
        <div className="flex items-center justify-center text-center py-12 h-64">
          <p className="text-red-500 font-semibold">{error}</p>
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="flex items-center justify-center text-center py-12 h-64">
          <p className="text-slate-600">No homes available at the moment. Please check back later!</p>
        </div>
      );
    }

    // --- FIX: Use LayoutGroup to isolate ID contexts ---
    // We wrap each section in a unique LayoutGroup. This prevents Framer Motion
    // from thinking the "Popular" card and the "Recently Viewed" card (which share an ID)
    // are the same element trying to move, which causes one to become invisible.
    return (
      <div className="flex flex-col pb-12">
        <LayoutGroup id="recently-viewed-section">
          <AnimatePresence>
            {recentlyViewed.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <RecentlyViewedBanner listings={recentlyViewed} />
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>

        <FilterChips activeFilter={activeFilter} setActiveFilter={handleFilterChange} />

        {popularHomes.length > 0 && (
          <LayoutGroup id="popular-section">
            <div className="relative">
              {isFiltering && (
                <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                  <RoovoLoader className="w-12 h-auto text-indigo-600" />
                </div>
              )}
              <ListingSection
                key={`popular-${activeFilter}`}
                title={getDynamicTitle(activeFilter, 'Karnataka')}
                listings={popularHomes}
                loading={false}
              />
            </div>
          </LayoutGroup>
        )}

        {weekendHomes.length > 0 && (
          <LayoutGroup id="weekend-section">
            <ListingSection
              key={`weekend-${activeFilter}`}
              title="Available this weekend"
              listings={weekendHomes}
              loading={false}
            />
          </LayoutGroup>
        )}

        {activeFilter === 'all' && newHomes.length > 0 && (
          <LayoutGroup id="new-section">
            <ListingSection
              key={`new-${activeFilter}`}
              title="New homes on Roovo"
              listings={newHomes}
              loading={false}
            />
          </LayoutGroup>
        )}

        <div className="flex flex-col items-center justify-center pt-12 pb-6 opacity-70 px-8">
          <div className="w-24 mb-4 grayscale opacity-60">
            <RoovoLogo />
          </div>
          <p className="text-sm text-slate-500 font-medium text-center italic">
            "{quote}"
          </p>
          <p className="text-xs text-slate-400 mt-2">You've reached the end!</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Full Screen Loader Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white"
          >
            <RoovoLoader className="w-32 h-auto text-indigo-600" />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-5 transition-all duration-200 border-b border-slate-100/50">
        <AnimatePresence>
          {headerState === 'greeting' && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
              className="flex items-center overflow-hidden"
            >
              <span className="text-2xl font-bold text-slate-900">{getGreeting()}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          onClick={() => {
            triggerHaptic();
            setIsSearchOpen(true);
            setIsNavBarVisible(false);
          }}
          className="bg-white border border-slate-200/80 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3 pr-4 flex items-center gap-3 active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          <div className="bg-indigo-50 rounded-full p-2.5 text-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-[0.95rem]">Where to?</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Anywhere • Any week • Add guests</p>
          </div>
          <div className="p-2 rounded-full border border-slate-100 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
        </div>
      </header>

      <main
        className={`w-full md:max-w-7xl mx-auto px-4 sm:px-8 py-6 ${showBottomNavBar ? 'pb-24' : ''
          }`}
      >
        {renderContent()}
      </main>

      {isSearchOpen && (
        <MobileSearchBar onClose={() => {
          setIsSearchOpen(false);
          setIsNavBarVisible(true);
        }} />
      )}
    </div>
  );
};

export default HomeFeed;
