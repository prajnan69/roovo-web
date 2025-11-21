import type { ListingData as Listing } from '@/types';

const CACHE_KEY = 'listingsCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface Cache {
  listings: Listing[];
  timestamp: number;
}

export const getCachedListings = (): Listing[] | null => {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    const { listings, timestamp }: Cache = JSON.parse(cachedData);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return listings;
    }
  }
  return null;
};

export const setCachedListings = (listings: Listing[]) => {
  const cache: Cache = {
    listings,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};
