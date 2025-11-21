"use client";

import { useState, useEffect } from "react";
import { getListingsWithBookingsByHostId } from "../../services/api";
import supabase from "../../services/api";
import ListingCarousel from "./ListingCarousel";
import CalendarGrid from "./CalendarGrid";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  guest_id: string;
}

interface Listing {
  id: string;
  title: string;
  price_per_night: number;
  weekend_price: number;
  primary_image_url: string;
  bookings?: Booking[];
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const getListings = async () => {
      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const hostId = session.user.id;
          const data = await getListingsWithBookingsByHostId(hostId);
          setListings(data);
          if (data.length > 0) {
            setSelectedListing(data[0]);
            setBookings(data[0].bookings || []);
          }
        } else {
          console.log("No active session or user ID found.");
        }
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getListings();
  }, []);

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
    setBookings(listing.bookings || []);
  };

  const goToPreviousMonth = () => {
    setDirection(-1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="p-4">
      <ListingCarousel
        listings={listings}
        selectedListing={selectedListing}
        onSelectListing={handleSelectListing}
      />
      <CalendarGrid
        currentDate={currentDate}
        bookings={bookings}
        isLoading={isLoading}
        direction={direction}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
      />
    </div>
  );
};

export default Calendar;
