import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ('places' | 'maps' | 'marker')[] = ['places', 'maps', 'marker'];

export const useGoogleMapsLoader = () => {
  return useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];

      let city = '';
      let state = '';
      let country = '';

      for (const component of result.address_components) {
        // Use locality for the place name (e.g., "Hebre")
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('country')) {
          country = component.long_name;
        }
      }

      if (city && state) return `${city}, ${state}`;
      if (state && country) return `${state}, ${country}`;
      return result.formatted_address;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
};

export interface ResolvedArea {
  district: string | null;
  city: string | null;
}

// Listings carry only coordinates — place/city/public_address are empty in the
// DB — so the destination picker has to derive "which district, which city"
// from lat/lng. That's one Geocoding call per listing, so results are cached
// in localStorage keyed by rounded coordinates (~100m buckets): a listing's
// district never changes, and nearby listings share a lookup.
const AREA_CACHE_KEY = 'geo_area_cache_v1';

type AreaCache = Record<string, ResolvedArea>;

const readAreaCache = (): AreaCache => {
  try {
    return JSON.parse(localStorage.getItem(AREA_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeAreaCache = (cache: AreaCache) => {
  try {
    localStorage.setItem(AREA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode — cache is an optimisation, not a requirement */
  }
};

const areaKey = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

export const resolveArea = async (lat: number, lng: number): Promise<ResolvedArea> => {
  const key = areaKey(lat, lng);
  const cache = readAreaCache();
  if (cache[key]) return cache[key];

  const empty: ResolvedArea = { district: null, city: null };
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return empty;

    let districtL3 = '';
    let districtL2 = '';
    let locality = '';
    let sublocality = '';

    for (const component of data.results[0].address_components) {
      if (component.types.includes('administrative_area_level_3')) districtL3 = component.long_name;
      if (component.types.includes('administrative_area_level_2')) districtL2 = component.long_name;
      if (component.types.includes('locality')) locality = component.long_name;
      if (component.types.includes('sublocality_level_1')) sublocality = component.long_name;
    }

    // level_3 is the true district in India; level_2 is the broader revenue
    // division ("Bangalore Division"), which is too coarse to show as a place.
    const resolved: ResolvedArea = {
      district: districtL3 || districtL2 || null,
      city: locality || sublocality || null,
    };

    cache[key] = resolved;
    writeAreaCache(cache);
    return resolved;
  } catch (error) {
    console.error('resolveArea failed:', error);
    return empty;
  }
};

// District-level label (e.g. "Bengaluru Urban", "Uttara Kannada") instead of
// city+state. India's admin hierarchy has an extra tier Google doesn't map
// uniformly: for Karnataka coordinates administrative_area_level_2 comes
// back as the revenue *division* ("Bangalore Division") — level_3 is the
// actual district ("Bengaluru Urban"). Prefer level_3 and fall back to
// level_2 for areas/states without that extra tier.
export const reverseGeocodeDistrict = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];

      let districtL3 = '';
      let districtL2 = '';
      let city = '';
      let state = '';

      for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_3')) {
          districtL3 = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          districtL2 = component.long_name;
        }
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
      }

      return districtL3 || districtL2 || city || state || null;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding (district) failed:', error);
    return null;
  }
};
