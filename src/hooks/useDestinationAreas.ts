import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/services/api';
import { getCachedListings } from '@/services/cache';
import { resolveArea } from '@/lib/googleMaps';
import { findDistrict, KARNATAKA_DISTRICTS, type KarnatakaDistrict } from '@/data/karnatakaDistricts';

export interface AreaCity {
  name: string;
  lat: number;
  lng: number;
  count: number;
}

export interface AreaDistrict {
  /** Canonical name from the Karnataka table when we can match it, else whatever Google returned. */
  name: string;
  /** Where to drop the pin: the district HQ if known, otherwise the mean of its listings. */
  lat: number;
  lng: number;
  count: number;
  cities: AreaCity[];
  listings: any[];
}

const getLat = (l: any) => Number(l.latitude ?? l.location?.latitude);
const getLng = (l: any) => Number(l.longitude ?? l.location?.longitude);

const mean = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

/**
 * Groups live listings into Karnataka districts and the cities within them.
 *
 * Listings store no location text (place/city/public_address are empty), so
 * every grouping decision comes from reverse-geocoding the listing's own
 * coordinates. Those lookups are cached in localStorage, so this is a single
 * burst of Geocoding calls the first time and free on subsequent opens.
 */
export const useDestinationAreas = () => {
  const [districts, setDistricts] = useState<AreaDistrict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        let listings: any[] | null = getCachedListings();
        if (!listings || listings.length === 0) {
          const res = await fetch(`${API_BASE_URL}/api/listings`);
          const data = await res.json();
          listings = data.data || [];
        }

        const located = (listings || []).filter((l) => getLat(l) && getLng(l));

        const areas = await Promise.all(
          located.map(async (listing) => ({
            listing,
            area: await resolveArea(getLat(listing), getLng(listing)),
          }))
        );
        if (cancelled) return;

        // district name -> listings, then city name -> listings within it
        const byDistrict = new Map<string, { listings: any[]; cities: Map<string, any[]> }>();

        for (const { listing, area } of areas) {
          if (!area.district) continue;
          const canonical = findDistrict(area.district)?.name || area.district;
          if (!byDistrict.has(canonical)) {
            byDistrict.set(canonical, { listings: [], cities: new Map() });
          }
          const entry = byDistrict.get(canonical)!;
          entry.listings.push(listing);

          const cityName = area.city || canonical;
          if (!entry.cities.has(cityName)) entry.cities.set(cityName, []);
          entry.cities.get(cityName)!.push(listing);
        }

        const result: AreaDistrict[] = Array.from(byDistrict.entries()).map(([name, entry]) => {
          const known = findDistrict(name);
          return {
            name,
            // Prefer the known HQ so the pin sits on the town people recognise;
            // fall back to the middle of the actual listings.
            lat: known?.lat ?? mean(entry.listings.map(getLat)),
            lng: known?.lng ?? mean(entry.listings.map(getLng)),
            count: entry.listings.length,
            listings: entry.listings,
            cities: Array.from(entry.cities.entries())
              .map(([cityName, cityListings]) => ({
                name: cityName,
                lat: mean(cityListings.map(getLat)),
                lng: mean(cityListings.map(getLng)),
                count: cityListings.length,
              }))
              .sort((a, b) => b.count - a.count),
          };
        });

        result.sort((a, b) => b.count - a.count);
        setDistricts(result);
      } catch (error) {
        console.error('Failed to build destination areas:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Districts with no inventory yet — rendered muted as "coming soon" pins. */
  const comingSoon: KarnatakaDistrict[] = KARNATAKA_DISTRICTS.filter(
    (d) => !districts.some((active) => active.name === d.name)
  );

  return { districts, comingSoon, loading };
};
