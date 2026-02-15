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
