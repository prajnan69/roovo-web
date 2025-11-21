"use client";

import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../lib/googleMaps";

interface MapViewProps {
  latitude: number;
  longitude: number;
}

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "12px",
};

export default function MapView({ latitude, longitude }: MapViewProps) {
  const { isLoaded } = useGoogleMapsLoader();

  const center = {
    lat: !isNaN(latitude) ? latitude : 0,
    lng: !isNaN(longitude) ? longitude : 0,
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
