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
import { useNavigation } from '@/hooks/useNavigation';
import RecentlyViewedBanner from './RecentlyViewedBanner';
import FilterChips from './FilterChips';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import RoovoLogo from './RoovoLogo';
import RoovoLoader from './RoovoLoader';
import { getRandomQuote } from '@/data/travelQuotes';
import SplitStatusDrawer from './SplitStatusDrawer';

const HomeFeed: React.FC<{
  onSwitchToHost?: () => void;
  showBottomNavBar?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  upcomingBooking?: any;
  pendingSplit?: any;
}> = ({
  onSwitchToHost,
  showBottomNavBar,
  onLoadingChange,
  upcomingBooking,
  pendingSplit,
}) => {
    console.log('HomeFeed Props - pendingSplit:', pendingSplit, 'upcomingBooking:', upcomingBooking);
    const { setIsNavBarVisible } = useBottomNavBar();
    const { navigate } = useNavigation();
    const [isSplitStatusOpen, setIsSplitStatusOpen] = useState(false);
    const [listings, setListings] = useState<Listing[]>(() => getCachedListings() || []);
    const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
    const [headerState, setHeaderState] = useState<'greeting' | 'hidden'>('greeting');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [quote, setQuote] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [isFiltering, setIsFiltering] = useState(false);

    useEffect(() => {
      onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    // Ensure nav bar is visible when HomeFeed mounts (fixes missing nav bar after back from Search)
    useEffect(() => {
      setIsNavBarVisible(true);
      return () => setIsNavBarVisible(true); // Safety cleanup
    }, [setIsNavBarVisible]);

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
        case 'apartment': return `Popular Apartments in ${location}`;
        case 'house': return `Popular Houses in ${location}`;
        case 'villa': return `Popular Villas in ${location}`;
        case '1_bed': return `Popular 1 Bed homes in ${location}`;
        case '2_plus_beds': return `Popular 2+ Bed homes in ${location}`;
        case 'pet_friendly': return `Popular Pet Friendly homes in ${location}`;
        case 'self_check_in': return `Popular Self Check-in homes in ${location}`;
        default: return `Popular homes in ${location}`;
      }
    };

    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    };

    const popularHomes = filteredListings.slice(0, 8);
    const weekendHomes = filteredListings.slice(8, 16);
    const newHomes = listings.length < 5 ? listings : listings.slice(4, 12);

    const fetchListings = async (city?: string) => {
      setError(null);
      setLoading(true);

      const cachedListings = getCachedListings();

      // Temporarily bypass cache to force fresh fetch and clear old 'room' listings from user's view.
      if (cachedListings) {
        setListings(cachedListings);
        setFilteredListings(cachedListings);
      }

      try {
        const url = city ? `${API_BASE_URL}/api/listings?city=${city}` : `${API_BASE_URL}/api/listings`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch listings');
        const data = await response.json();
        const listingsWithExtras = (data.data || []).map((listing: Listing) => ({
          ...listing,
          rating: listing.overall_rating || (Math.random() * (5.0 - 4.2) + 4.2).toFixed(1),
        }));

        setListings(listingsWithExtras);
        setFilteredListings(listingsWithExtras);
        setCachedListings(listingsWithExtras);

      } catch (error) {
        console.error("Error fetching listings:", error);
        if (!cachedListings) {
          setError("We couldn't load the listings. Please try again later.");
          setLoading(false);
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    // Global Banner Trigger Logic (Pull-to-reveal) & Header hide
    useEffect(() => {
      const handleScroll = () => {
        const currentScrollY = window.scrollY;

        // If dragging way down (overscroll simulation)
        if (currentScrollY < -50) {
          window.dispatchEvent(new CustomEvent('show-global-banner', {
            detail: {
              title: 'Upcoming Booking',
              subtitle: 'Confirmed • Today in Karnataka'
            }
          }));
        }

        if (currentScrollY > 10) {
          setHeaderState('hidden');
        } else {
          setHeaderState('greeting');
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
      const timer = setTimeout(() => setHeaderState('hidden'), 5000);
      return () => clearTimeout(timer);
    }, []);

    // Main Initialization Effect
    useEffect(() => {
      setQuote(getRandomQuote());
      fetchListings();

      const fetchUserDataAndHistory = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const combinedRecentlyViewed: Listing[] = [];

        // 1. Get Local items first
        let localItems: Listing[] = [];
        try {
          const localHistoryStr = localStorage.getItem('recentlyViewed');
          if (localHistoryStr) {
            localItems = JSON.parse(localHistoryStr);
          }
        } catch (e) {
          console.error('Error parsing local recently viewed:', e);
        }

        // 2. Validate Local items and fetch DB items
        try {
          const apiRequests: Promise<any>[] = [];

          // API request for DB items (if logged in)
          if (session) {
            apiRequests.push(fetch(`${API_BASE_URL}/api/recently-viewed/${session.user.id}`).then(res => res.json()));
          }

          // API request to validate local items
          if (localItems.length > 0) {
            const localIds = localItems.map(item => item.id);
            apiRequests.push(fetch(`${API_BASE_URL}/api/listings/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: localIds })
            }).then(res => res.json()));
          }

          const results = await Promise.all(apiRequests);

          let dbListings: Listing[] = [];
          let validatedLocalListings: Listing[] = [];

          if (session) {
            const dbData = results[0];
            if (Array.isArray(dbData)) {
              dbListings = dbData.map((item: any) => item.listings);
            }
            if (localItems.length > 0) {
              const batchData = results[1];
              if (batchData?.data) validatedLocalListings = batchData.data;
            }
          } else if (localItems.length > 0) {
            const batchData = results[0];
            if (batchData?.data) validatedLocalListings = batchData.data;
          }

          combinedRecentlyViewed.push(...validatedLocalListings);
          combinedRecentlyViewed.push(...dbListings);

          // Update localStorage with validated items (optional but good for consistency)
          if (validatedLocalListings.length !== localItems.length) {
            localStorage.setItem('recentlyViewed', JSON.stringify(validatedLocalListings));
          }

        } catch (error) {
          console.error('Error fetching/validating recently viewed:', error);
          // Fallback to local items if API fails (better than nothing)
          combinedRecentlyViewed.push(...localItems);
        }

        // 3. Keep first occurrence (newest) of each listing, and filter out individual rooms
        const seen = new Set();
        const uniqueRecentlyViewed = combinedRecentlyViewed.filter(item => {
          if (!item || !item.id) return false;

          // Filter out private rooms from home page Recently Viewed
          if (item.inventory_type === 'private_room') return false;

          const idString = String(item.id);
          if (seen.has(idString)) return false;
          seen.add(idString);
          return true;
        }).slice(0, 10);

        setRecentlyViewed(uniqueRecentlyViewed);
      };

      fetchUserDataAndHistory();
    }, []);

    useEffect(() => {
      const applyFilters = () => {
        console.log('[HomeFeed] Applying filters. Active Filter:', activeFilter);
        if (activeFilter === 'all') {
          setFilteredListings(listings);
        } else {
          const filtered = listings.filter(listing => {
            // Check category first (Exact match with activeFilter value)
            const matches = listing.category === activeFilter;
            if (matches) return true;

            // Fallback to legacy/property_type filters
            if (activeFilter === 'apartment') return listing.property_type === 'Apartment';
            if (activeFilter === 'house') return listing.property_type === 'House';
            if (activeFilter === 'villa') return listing.property_type === 'Villa';

            // Feature filters
            if (activeFilter === '1_bed') return listing.total_beds === 1;
            if (activeFilter === '2_plus_beds') return (listing.total_beds || 0) >= 2;
            if (activeFilter === 'pet_friendly') return listing.pets_allowed;

            if (activeFilter === 'self_check_in') {
              return (listing as any).self_check_in === true;
            }
            return false;
          });
          setFilteredListings(filtered);
        }
      };
      applyFilters();
    }, [activeFilter, listings]);

    const renderContent = () => {
      if (error) {
        return (
          <div className="flex items-center justify-center text-center py-12 h-64">
            <p className="text-red-500 font-semibold">{error}</p>
          </div>
        );
      }

      if (!loading && listings.length === 0) {
        return (
          <div className="flex items-center justify-center text-center py-12 h-64">
            <p className="text-slate-600">No homes available at the moment. Please check back later!</p>
          </div>
        );
      }

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

          {(popularHomes.length > 0 || loading) && (
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
                  loading={loading}
                />
              </div>
            </LayoutGroup>
          )}

          {(weekendHomes.length > 0 || loading) && (
            <LayoutGroup id="weekend-section">
              <ListingSection
                key={`weekend-${activeFilter}`}
                title="Available this weekend"
                listings={weekendHomes}
                loading={loading}
              />
            </LayoutGroup>
          )}

          {activeFilter === 'all' && (newHomes.length > 0 || loading) && (
            <LayoutGroup id="new-section">
              <ListingSection
                key={`new-${activeFilter}`}
                title="New homes on Roovo"
                listings={newHomes}
                loading={loading}
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
        <AnimatePresence>
          {/* Full screen loader removed for skeleton UI */}
        </AnimatePresence>

        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+1rem)] pb-2 px-5 transition-all duration-200 border-b border-slate-100/50 flex flex-col items-center">
          <AnimatePresence>
            {headerState === 'greeting' && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                className="flex items-center overflow-hidden w-full"
              >
                <span className="text-2xl font-bold text-slate-900">{getGreeting()}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-full max-w-3xl mx-auto px-1">
            <div
              onClick={() => {
                triggerHaptic();
                setIsSearchOpen(true);
                setIsNavBarVisible(false);
              }}
              className={`bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 pr-4 flex items-center gap-3 active:scale-[0.98] transition-all duration-200 cursor-pointer w-full ${(upcomingBooking || pendingSplit) ? 'rounded-t-[28px] rounded-b-none border-b-0' : 'rounded-full'
                }`}
            >
              <div className="bg-indigo-50 rounded-full p-2.5 text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-[0.95rem]">Where to?</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Anywhere • Any week • Add guests</p>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  window.location.reload();
                }}
                className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>

            <AnimatePresence>
              {(pendingSplit || upcomingBooking) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  onClick={() => {
                    triggerHaptic();
                    if (pendingSplit) {
                      setIsSplitStatusOpen(true);
                    } else {
                      navigate('/trips');
                    }
                  }}
                  className={`w-full flex items-center gap-2 py-2.5 px-5 border-x border-b -mt-[1px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] cursor-pointer active:scale-[0.99] transition-all ${pendingSplit
                    ? 'bg-indigo-600 text-white rounded-b-[24px] border-indigo-700'
                    : 'bg-slate-50 border-slate-100 rounded-b-[28px] text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {pendingSplit ? (
                      <>
                        <div className="bg-white/20 p-1.5 rounded-full animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-[11px] font-bold tracking-tight">
                            {pendingSplit.is_primary_payer
                              ? `Split Requested • ${pendingSplit.all_participants.length} people`
                              : `Pay Your Share • ${pendingSplit.initiator_name || (pendingSplit.initiator_phone || '').replace(/\D/g, '').slice(-10)}`
                            }
                          </p>
                          <p className="text-[10px] opacity-90 truncate">
                            {pendingSplit.all_participants.filter((p: any) => p.status === 'paid').length} of {pendingSplit.all_participants.length} paid
                          </p>
                        </div>
                        <div className="ml-auto text-[10px] font-bold bg-white/30 px-2 py-0.5 rounded-full">
                          View Status
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 whitespace-nowrap">Upcoming trip</span>
                        <div className="w-[1px] h-3 bg-slate-200" />
                        <p className="text-[11px] font-semibold text-indigo-600 truncate">
                          {upcomingBooking.listing?.city || upcomingBooking.listing?.place || 'Your destination'} • {new Date(upcomingBooking.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(upcomingBooking.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main
          className={`w-full md:max-w-7xl mx-auto px-4 sm:px-8 pt-2 pb-6 ${showBottomNavBar ? 'pb-24' : ''
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

        <SplitStatusDrawer
          isOpen={isSplitStatusOpen}
          onClose={() => setIsSplitStatusOpen(false)}
          splitData={pendingSplit}
        />

      </div>
    );
  };

export default HomeFeed;
