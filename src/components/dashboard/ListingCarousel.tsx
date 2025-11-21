"use client";

import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface Listing {
  id: string;
  title: string;
  price_per_night: number;
  weekend_price: number;
  primary_image_url: string;
}

interface ListingCarouselProps {
  listings: Listing[];
  selectedListing: Listing | null;
  onSelectListing: (listing: Listing) => void;
}

const ListingCarousel = ({
  listings,
  selectedListing,
  onSelectListing,
}: ListingCarouselProps) => {
  const handleSelect = async (listing: Listing) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onSelectListing(listing);
  };

  return (
    <div className="flex overflow-x-auto gap-2 mb-6 md:mb-8 pb-2 scrollbar-hide">
      {listings.map((listing) => (
        <button
          key={listing.id}
          className={`flex-shrink-0 px-4 py-2 rounded-full cursor-pointer transition-all duration-300 text-sm font-semibold ${selectedListing?.id === listing.id
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => handleSelect(listing)}
        >
          {listing.title}
        </button>
      ))}
    </div>
  );
};

export default ListingCarousel;
