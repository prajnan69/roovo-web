"use client";

import React, { useEffect, useMemo, useState } from 'react';
import ListingSection from './ListingSection';
import { API_BASE_URL } from '@/services/api';
import MobileSearchBar from './MobileSearchBar';
import type { ListingData as Listing } from '@/types';
import supabase from '@/services/api';
import { triggerHaptic } from '@/lib/haptics';
import { getCachedListings, setCachedListings, getListingsPrefetch } from '@/services/cache';
import { useBottomNavBar } from '@/context/BottomNavBarContext';
import { useNavigation } from '@/hooks/useNavigation';
import RecentlyViewedBanner from './RecentlyViewedBanner';
import { Map } from 'lucide-react';
import FullScreenMap from './search/FullScreenMap';
import FilterChips from './FilterChips';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import RoovoLogo from './RoovoLogo';
import RoovoLoader from './RoovoLoader';
import { getRandomQuote } from '@/data/travelQuotes';
import SplitStatusDrawer from './SplitStatusDrawer';
import Footer from './Footer';
import { resolveImageUrl } from '@/utils/imageUtils';

// Refetches often return payloads identical to what's already on screen; fresh
// object identities would re-render every card for nothing, so keep the
// previous state object when the data hasn't actually changed.
const keepIfUnchanged = <T,>(next: T) => (prev: T): T =>
  JSON.stringify(prev) === JSON.stringify(next) ? prev : next;

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
    const { setIsNavBarVisible } = useBottomNavBar();
    const { navigate, pathname } = useNavigation();
    const [isSplitStatusOpen, setIsSplitStatusOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [listings, setListings] = useState<Listing[]>(() => getCachedListings() || []);
    const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>(() => {
      try {
        const localHistoryStr = localStorage.getItem('recentlyViewed');
        if (localHistoryStr) {
          const parsed = JSON.parse(localHistoryStr);
          if (Array.isArray(parsed)) {
            return parsed.filter(item => item && item.inventory_type !== 'private_room').slice(0, 10);
          }
        }
      } catch (e) {
        console.error('Error parsing local recently viewed for initial state:', e);
      }
      return [];
    });
    const [headerState, setHeaderState] = useState<'greeting' | 'hidden'>('greeting');
    const [loading, setLoading] = useState(() => !getCachedListings());
    const [error, setError] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [quote, setQuote] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [isFiltering, setIsFiltering] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Derived, not state: keeping this in a useState synced by an effect left
    // the first paint after a remount with empty sections (the effect only ran
    // after paint), which flashed the placeholder cards before the real ones.
    const filteredListings = useMemo(() => {
      if (activeFilter === 'all') return listings;
      return listings.filter(listing => {
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
    }, [activeFilter, listings]);

    useEffect(() => {
      onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    // Ensure nav bar is visible whenever home becomes the active route (fixes
    // missing nav bar after back from Search). Keyed to pathname, not mount:
    // HomeFeed now stays permanently mounted across navigation.
    useEffect(() => {
      if (pathname === '/') setIsNavBarVisible(true);
    }, [pathname, setIsNavBarVisible]);

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
      if (listings.length === 0) {
        setLoading(true);
      }

      try {
        let listingsWithExtras: Listing[];

        // For the default (no city filter) load, fetch fresh listings from the network (revalidate)
        if (!city) {
          // Check if cache is fresh enough (e.g. less than 60 seconds old) to skip refetch
          let isCacheFresh = false;
          try {
            const cachedData = localStorage.getItem('listingsCache');
            if (cachedData) {
              const { timestamp } = JSON.parse(cachedData);
              if (Date.now() - timestamp < 60000) { // 60 seconds
                isCacheFresh = true;
              }
            }
          } catch {}

          if (isCacheFresh && listings.length > 0) {
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/listings`);
          if (!response.ok) throw new Error('Failed to fetch listings');
          const data = await response.json();
          listingsWithExtras = (data.data || []).map((listing: Listing) => {
            const idStr = String(listing.id);
            let hash = 0;
            for (let i = 0; i < idStr.length; i++) {
              hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            const ratingVal = 4.2 + (Math.abs(hash) % 9) * 0.1;
            return {
              ...listing,
              rating: listing.overall_rating || ratingVal.toFixed(1),
            };
          });
          setCachedListings(listingsWithExtras);
        } else {
          const response = await fetch(`${API_BASE_URL}/api/listings?city=${city}`);
          if (!response.ok) throw new Error('Failed to fetch listings');
          const data = await response.json();
          listingsWithExtras = (data.data || []).map((listing: Listing) => {
            const idStr = String(listing.id);
            let hash = 0;
            for (let i = 0; i < idStr.length; i++) {
              hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            const ratingVal = 4.2 + (Math.abs(hash) % 9) * 0.1;
            return {
              ...listing,
              rating: listing.overall_rating || ratingVal.toFixed(1),
            };
          });
        }

        setListings(keepIfUnchanged(listingsWithExtras));

        // Warm the cache for the first screenful of images so cards don't
        // pop in blank, but don't hold the skeleton up for it — these are
        // third-party (Airbnb CDN) images with unpredictable load time, and
        // the listing data itself is already ready to render.
        listingsWithExtras
          .slice(0, 4)
          .flatMap((l: any) => (l.all_image_urls || []).slice(0, 5).map((img: any) => {
            const path = typeof img === 'string' ? img : img?.url;
            return resolveImageUrl(path);
          }))
          .filter(Boolean)
          .forEach((src: string) => {
            const img = new window.Image();
            img.src = src;
          });
      } catch (error) {
        console.error('Error fetching listings:', error);
        if (listings.length > 0) {
          // Keep showing currently loaded listings
        } else {
          const cachedListings = getCachedListings();
          if (cachedListings) {
            setListings(cachedListings);
          } else {
            setError('Could not load listings. Please check your internet connection.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    // Global Banner Trigger Logic (Pull-to-reveal) & Header hide
    useEffect(() => {
      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        // Threshold boolean, not the raw value: setting scrollY in state
        // re-rendered the entire feed on every scroll frame. React bails out
        // when the boolean doesn't change, so this only renders at crossings.
        setIsScrolled(currentScrollY > 10);

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

      // Previously delayed by 300ms for no clear reason — HomeFeed mounts
      // only after the splash screen unmounts, so nothing here needs to wait
      // its turn. That delay was pure added time in front of the skeleton.
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

        setRecentlyViewed(keepIfUnchanged(uniqueRecentlyViewed));
      };

      fetchUserDataAndHistory();
    }, []);

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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <RecentlyViewedBanner listings={recentlyViewed} />
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>

          <FilterChips activeFilter={activeFilter} setActiveFilter={handleFilterChange} />

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

          <LayoutGroup id="weekend-section">
            <ListingSection
              key={`weekend-${activeFilter}`}
              title="Available this weekend"
              listings={weekendHomes}
              loading={loading}
            />
          </LayoutGroup>

          {/* ── Why Roovo Trust Strip (from prototype) ── */}
          <div style={{ margin: '8px 20px 0', background: 'linear-gradient(135deg,#4F46E5,#6D28D9)', borderRadius: 24, padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '9999px', background: 'rgba(255,255,255,.07)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '9999px', background: 'rgba(255,255,255,.05)' }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Why Roovo?</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-.03em', lineHeight: 1.25, marginBottom: 16 }}>
              8–10% cheaper<br /><span style={{ fontStyle: 'italic' }}>than Airbnb, always.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '✓', text: 'Always cheaper than Airbnb' },
                { icon: '⬡', text: 'Roovo Verified stays' },
                { icon: '✦', text: 'GST invoices for every booking' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#fff' }}>{p.icon}</div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.88)' }}>{p.text}</span>
                </div>
              ))}
            </div>
          </div>

          {activeFilter === 'all' && (
            <LayoutGroup id="new-section">
              <ListingSection
                key={`new-${activeFilter}`}
                title="Just added to Roovo"
                listings={newHomes}
                loading={loading}
              />
            </LayoutGroup>
          )}

          <Footer />
        </div>
      );
    };

    return (
      <div className="h-screen w-full overflow-y-auto overflow-x-hidden relative" style={{ background: '#FAF9F7' }}>
        <AnimatePresence>
          {/* Full screen loader removed for skeleton UI */}
        </AnimatePresence>

        <header
          className="sticky top-0 z-40 flex flex-col items-center"
          style={{
            background: headerState === 'greeting'
              ? 'rgba(250,249,247,0.78)'
              : isScrolled ? 'rgba(250,249,247,0.96)' : 'transparent',
            backdropFilter: headerState === 'greeting'
              ? 'blur(24px)'
              : isScrolled ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: headerState === 'greeting'
              ? 'blur(24px)'
              : isScrolled ? 'blur(20px)' : 'none',
            borderBottom: headerState === 'greeting'
              ? '1px solid rgba(0,0,0,.06)'
              : isScrolled ? '1px solid rgba(0,0,0,.065)' : 'none',
            borderRadius: headerState === 'greeting' ? '0 0 28px 28px' : 0,
            transition: 'background .3s, border-color .3s, backdrop-filter .3s, border-radius .3s',
            paddingTop: 'max(env(safe-area-inset-top), 12px)',
          }}
        >
          <AnimatePresence>
            {headerState === 'greeting' && (
              <motion.div
                initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                animate={{ opacity: 1, maxHeight: 80, marginBottom: 14 }}
                exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden w-full px-5"
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>{getGreeting()}</div>
                <div style={{ fontSize: 28, fontWeight: 500, color: '#0A0A09', letterSpacing: '-.04em', lineHeight: 1.1, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}>
                  Find your perfect stay ✨
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-full max-w-3xl mx-auto" style={{ padding: '0 18px 14px' }}>
            <div
              onClick={() => {
                triggerHaptic();
                setIsSearchOpen(true);
                setIsNavBarVisible(false);
              }}
              className={`cursor-pointer w-full flex items-center gap-3 ${(upcomingBooking || pendingSplit) ? 'rounded-t-[28px] rounded-b-none' : 'rounded-full'}`}
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 3px 18px rgba(0,0,0,0.07)', padding: '12px 14px 12px 12px' }}
            >
              <div style={{ background: '#EEEEFF', borderRadius: '9999px', padding: '9px', display: 'flex', flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="#4F46E5" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 700, color: '#0A0A09', fontSize: 15, letterSpacing: '-.02em' }}>Where To?</p>
                <p style={{ fontSize: 12, color: '#888880', fontWeight: 500, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Goa · Bengaluru · Pondicherry</p>
              </div>
              {/* Opens every Karnataka stay on a full-screen map. Replaced a
                  refresh button that did a hard window.location.reload() —
                  a full app restart is not something a home screen should
                  offer, and it threw away all in-memory state. */}
              <div
                onClick={(e) => { e.stopPropagation(); triggerHaptic(); setIsMapOpen(true); }}
                style={{ padding: 8, borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.065)', color: '#4F46E5', display: 'flex' }}
                aria-label="Browse stays on a map"
              >
                <Map style={{ width: 15, height: 15 }} strokeWidth={2.2} />
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

        <main className="w-full pb-6">
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

        <FullScreenMap
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          listings={listings}
        />

      </div>
    );
  };

export default HomeFeed;
