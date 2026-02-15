import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

export const fetchBookingsByListingId = async (listingId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/bookings/listing/${listingId}`);
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
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

export const fetchBookingsByGuestId = async (guestId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/bookings/guest/${guestId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch guest bookings');
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
  try {
    const response = await fetch(`${API_BASE_URL}/api/recently-viewed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, listingId }),
    });

    console.log('[api] addRecentlyViewed response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[api] Failed to add recently viewed: ${response.status}`, errorText);
      return null;
    }

    const result = await response.json();
    console.log('[api] addRecentlyViewed success:', result);
    return result;
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
    return null;
  }
};

export const createSupportTicket = async (userId: string, message: string) => {
  const response = await fetch(`${API_BASE_URL}/api/support/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create support ticket: ${response.status}`, errorText);
    throw new Error('Failed to create support ticket');
  }

  return response.json();
};

export const updateListing = async (id: string, updates: any) => {
  const response = await fetch(`${API_BASE_URL}/api/listings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to update listing ${id}: ${response.status} ${response.statusText}`, errorText);
    throw new Error('Failed to update listing');
  }
  const data = await response.json();
  console.log(`Successfully updated listing ${id}:`, data);
  return data;
};

export const fetchAmenities = async () => {
  const response = await fetch(`${API_BASE_URL}/api/listings/amenities`);
  if (!response.ok) {
    throw new Error('Failed to fetch amenities');
  }
  return response.json();
};

export const fetchHostState = async (hostId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/hosts/${hostId}/trial`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch host state: ${response.status}`, errorText);
    throw new Error('Failed to fetch host state');
  }
  return response.json();
};

export const updatePayoutMethod = async (userId: string, payoutMethod: string, payoutDetails: any) => {
  const response = await fetch(`${API_BASE_URL}/api/payouts`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, payoutMethod, payoutDetails }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to update payout method: ${response.status}`, errorText);
    throw new Error('Failed to update payout method');
  }
  return response.json();
};

export const completeUserProfile = async (
  userId: string,
  data: { name: string; email?: string; gender: string; dob: string }
) => {
  const response = await fetch(`${API_BASE_URL}/api/users/complete-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to complete profile: ${response.status}`, errorText);
    throw new Error('Failed to complete profile');
  }

  return response.json();
};

export const initiateRPD = async (name: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/payouts/verify-initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to initiate verification');
  }

  return response.json();
};

export const getRPDStatus = async (verificationId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/payouts/verify-status/${verificationId}`);

  if (!response.ok) {
    throw new Error('Failed to get verification status');
  }

  return response.json();
};

export const fetchPriceOverrides = async (listingId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/price-overrides/${listingId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch price overrides');
  }
  return response.json();
};

export const batchCreatePriceOverrides = async (overrides: any[]) => {
  const response = await fetch(`${API_BASE_URL}/api/price-overrides/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to batch create price overrides: ${response.status}`, errorText);
    throw new Error('Failed to batch create price overrides');
  }
  return response.json();
};

export const fetchHostDrafts = async (hostId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/airbnb/host/${hostId}/drafts`);
  if (!response.ok) {
    throw new Error('Failed to fetch host drafts');
  }
  return response.json();
};

export const updateFcmToken = async (userId: string, token: string, platform: string) => {
  const response = await fetch(`${API_BASE_URL}/api/fcm/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, token, platform }),
  });
  if (!response.ok) {
    throw new Error('Failed to update FCM token');
  }
  return response.json();
};

export const acceptInvitationByCode = async (code: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/cohosts/accept-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, userId })
  });
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || 'Failed to accept invitation');
    } catch (e) {
      throw new Error(text || 'Failed to accept invitation');
    }
  }
  return response.json();
};

export default supabase;
export const syncIcal = async (listingId: string, icalUrl?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/ical/sync/${listingId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ icalUrl }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync iCal');
  }
  return response.json();
};
