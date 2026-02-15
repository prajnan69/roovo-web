"use client";

import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../../lib/googleMaps";
import type { ListingData } from "@/types";

interface MapViewProps {
  listing: ListingData;
}

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "12px",
};

export default function MapView({ listing }: MapViewProps) {
  const { isLoaded } = useGoogleMapsLoader();

  const lat = listing.location_and_neighborhood.latitude;
  const lng = listing.location_and_neighborhood.longitude;

  const center = {
    lat: !isNaN(lat) ? lat : 0,
    lng: !isNaN(lng) ? lng : 0,
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      {isLoaded ? (
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
          <Marker position={center} />
        </GoogleMap>
      ) : (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          Loading map...
        </div>
      )}
    </div>
  );
}
