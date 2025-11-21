import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ('places' | 'maps' | 'marker')[] = ['places', 'maps', 'marker'];

export const useGoogleMapsLoader = () => {
  return useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });
};
