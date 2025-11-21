export interface ListingData {
  latitude: boolean;
  longitude: any;
  id: number;
  host_id: string;
  auto_bookable?: boolean;
  title: string;
  status?: "active" | "draft" | "archived";
  description?: string;
  primary_image_url?: string;
  guests?: number;
  property_type: string;
  propertyDetails: any;
  property_description: {
    theSpace: string;
    guestAccess: string | null;
    otherThingsToNote: string | null;
  };
  accommodation: {
    sleepingArrangements: {
      room: string;
      beds: string;
    }[];
    totalBathrooms: number;
    totalBeds?: number;
  };
  price_per_night: number;
  booking_and_availability: {
    price: {
      pricePerNight: number;
      priceBreakdown: {
        basePrice: string;
        total: string;
      };
      priceDisclaimer: string;
    };
    availability: {
      selectedDates: {
        checkIn: string;
        checkOut: string;
        nights: number;
      };
    };
    cancellationPolicy: string;
  };
  house_rules: {
    checkIn: string;
    checkOut: string;
    maxGuests: number;
    petsAllowed: boolean;
    smokingAllowed: boolean;
    commercialPhotographyAllowed: boolean;
    additionalRules: string[];
  };
  amenities: {
    included: string[];
    notIncluded: string[];
  };
  ratings_and_reviews: {
    overallRating: number;
    totalReviews: number;
    detailedRatings: {
      cleanliness: number;
      accuracy: number;
      checkIn: number;
      communication: number;
      location: number;
      value: number;
    };
    individualReviews: IndividualReview[];
  };
  host_information: {
    name: string;
    profilePictureUrl: string;
    isSuperhost: boolean;
    hostingSince: string;
    stats: {
      reviews: number;
      averageRating: number;
      responseRate: number | null;
      responseTime: number | null;
    };
    bio: string[];
  };
  location_and_neighborhood: {
    address: string;
    latitude: number;
    longitude: number;
    neighborhoodDescription: string;
    gettingAround: string;
  };
  media: {
    primaryImageUrl: string;
    allImageUrls: Image[];
  };
  all_image_urls?: any[];
  address?: string;
  total_beds?: number;
  total_bathrooms?: number;
  max_guests: number;
  overall_rating?: number;
  total_reviews?: number; // Added for ConfirmAndPay component
  cancellation_policy?: string; // Added for ConfirmAndPay component
  the_space?: string;
  sleeping_arrangements?: {
    room: string;
    beds: string;
  }[];
  included_amenities?: string[];
  not_included_amenities?: string[];
  location?: {
    city: string;
  };
  host_profile_picture_url?: string;
  host_name?: string;
  is_superhost?: boolean;
  hosting_since?: string;
  host_bio?: string[];
  cleanliness_rating?: number;
  accuracy_rating?: number;
  checkin_rating?: number;
  communication_rating?: number;
  location_rating?: number;
  value_rating?: number;
  pets_allowed?: boolean;
  smoking_allowed?: boolean;
  additional_rules?: string[];
  gemini_response?: any;
  listing_type?: string;
  floors?: number;
  floor?: number;
  cleaning_fee?: number;
  bedrooms?: number;
  party_allowed?: boolean;
  self_check_in?: boolean;
  discounted?: boolean;
}

export interface Image {
  sl: number;
  url: string;
  alt: string;
}

export interface IndividualReview {
  reviewerName: string;
  reviewDate: string;
  reviewText: string;
}
