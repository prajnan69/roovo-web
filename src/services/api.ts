import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export const fetchListings = async () => {
  const response = await fetch(`${API_BASE_URL}/api/listings`);
  if (!response.ok) {
    throw new Error('Failed to fetch listings');
  }
  const data = await response.json();
  console.log('API Response:', data);
  return data;
};

export const searchListings = async (params: {
  location?: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  guests?: number;
  pets?: number;
  lat?: number;
  lng?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params.location) queryParams.append('location', params.location);
  if (params.checkIn) queryParams.append('checkIn', params.checkIn.toISOString());
  if (params.checkOut) queryParams.append('checkOut', params.checkOut.toISOString());
  if (params.guests) queryParams.append('guests', params.guests.toString());
  if (params.pets) queryParams.append('pets', params.pets.toString());
  if (params.lat) queryParams.append('lat', params.lat.toString());
  if (params.lng) queryParams.append('lng', params.lng.toString());

  console.log(`Searching listings with params: ${queryParams.toString()}`);
  const response = await fetch(`${API_BASE_URL}/api/listings/search?${queryParams.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to search listings: ${response.status} ${response.statusText}`, errorText);
    throw new Error('Failed to search listings');
  }
  const result = await response.json();
  console.log('Search results:', result.data);
  return result.data;
};

export const fetchListingById = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/api/listings/${id}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch listing ${id}: ${response.status} ${response.statusText}`, errorText);
    throw new Error('Failed to fetch listing');
  }
  const data = await response.json();
  console.log(`Successfully fetched listing ${id}:`, data);
  return data;
};

export const getListingsByHostId = async (hostId: string) => {
  console.log(`Fetching listings for host ID: ${hostId}`);
  const response = await fetch(`${API_BASE_URL}/api/listings/host/${hostId}`);
  if (!response.ok) {
    console.error('Failed to fetch listings by host ID:', response.status, response.statusText);
    throw new Error('Failed to fetch listings by host ID');
  }
  const result = await response.json();
  console.log('Listings data:', result.data);
  return result.data;
};

export const getListingsWithBookingsByHostId = async (hostId: string) => {
  console.log(`Fetching listings with bookings for host ID: ${hostId}`);
  const response = await fetch(`${API_BASE_URL}/api/listings/host/${hostId}/with-bookings`);
  if (!response.ok) {
    console.error('Failed to fetch listings with bookings by host ID:', response.status, response.statusText);
    throw new Error('Failed to fetch listings with bookings by host ID');
  }
  const result = await response.json();
  const listings = result.data;

  // For each listing, fetch the price overrides
  for (const listing of listings) {
    const overridesResponse = await fetch(`${API_BASE_URL}/api/price-overrides/${listing.id}`);
    if (overridesResponse.ok) {
      listing.price_overrides = await overridesResponse.json();
    } else {
      listing.price_overrides = [];
    }
  }

  console.log('Listings with bookings and overrides data:', listings);
  return listings;
};

export const fetchBookings = async (listingId?: string) => {
  let url = `${API_BASE_URL}/api/bookings`;
  if (listingId) {
    url += `?listing_id=${listingId}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }
  return response.json();
};

export const fetchConversationsByHostId = async (hostId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${hostId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
};

export const fetchConversationsByGuestId = async (guestId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/chat/conversations/guest/${guestId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
};

export const fetchPayoutsByHostId = async (hostId: string) => {
  const url = `${API_BASE_URL}/api/payouts/${hostId}`;
  console.log(`[API] Fetching payouts from: ${url}`);
  const response = await fetch(url);
  console.log(`[API] Payouts response status: ${response.status} ${response.statusText}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] Failed to fetch payouts:`, errorText);
    throw new Error('Failed to fetch payouts');
  }
  return response.json();
};

export const addRecentlyViewed = async (userId: string, listingId: string) => {
  const { data, error } = await supabase
    .from('recently_viewed')
    .insert([{ user_id: userId, listing_id: listingId }]);

  if (error) {
    console.error('Error adding to recently viewed:', error);
    return null;
  }

  return data;
};

export default supabase;
