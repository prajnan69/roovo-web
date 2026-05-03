import type { ListingData as Listing } from '@/types';

const CACHE_KEY = 'listingsCache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes — skip network on return visits

// ── Module-level singleton promise ──────────────────────────────────────────
// Starts the network fetch IMMEDIATELY when this module loads (before React
// renders), so by the time HomeFeed mounts, data is already in-flight or done.
let _prefetchPromise: Promise<Listing[]> | null = null;

export const getCachedListings = (): Listing[] | null => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { listings, timestamp }: { listings: Listing[]; timestamp: number } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return listings;
      }
    }
  } catch {
    // corrupted cache — ignore
  }
  return null;
};

export const setCachedListings = (listings: Listing[]): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ listings, timestamp: Date.now() }));
  } catch {
    // storage full — ignore
  }
};

// Call once at app startup (imported by main.tsx).
// Returns a promise that resolves with fresh listings from the API.
// Safe to call multiple times — only one network request is made.
export const prefetchListings = (apiBaseUrl: string): Promise<Listing[]> => {
  if (_prefetchPromise) return _prefetchPromise;

  // If valid cache exists, resolve immediately without a network call
  const cached = getCachedListings();
  if (cached) {
    _prefetchPromise = Promise.resolve(cached);
    return _prefetchPromise;
  }

  _prefetchPromise = fetch(`${apiBaseUrl}/api/listings`)
    .then((res) => {
      if (!res.ok) throw new Error('Prefetch failed');
      return res.json();
    })
    .then((data) => {
      const listings: Listing[] = (data.data || []).map((l: Listing) => ({
        ...l,
        rating: l.overall_rating || (Math.random() * (5.0 - 4.2) + 4.2).toFixed(1),
      }));
      setCachedListings(listings);
      return listings;
    })
    .catch(() => {
      _prefetchPromise = null; // allow retry on failure
      return cached ?? [];
    });

  return _prefetchPromise;
};

// HomeFeed calls this to get the already-in-flight promise
export const getListingsPrefetch = (): Promise<Listing[]> | null => _prefetchPromise;
