const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export interface BookingConfirmationParams {
  guestPhone: string;
  guestName: string;
  hostId: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  bookingId?: string;
}

export interface WelcomeMessageParams {
  guestPhone: string;
  guestName: string;
  listingId: string;
  listingTitle: string;
  hostName: string;
}

export async function sendBookingConfirmation(params: BookingConfirmationParams): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/whatsapp/booking-confirmed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    // Non-blocking — WhatsApp failure should not break booking flow
    console.error('[WhatsApp] booking confirmation failed:', err);
  }
}

export async function sendWelcomeMessage(params: WelcomeMessageParams): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/whatsapp/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.error('[WhatsApp] welcome message failed:', err);
  }
}
