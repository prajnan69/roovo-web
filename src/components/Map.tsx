"use client";

import { useState, useMemo } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../lib/googleMaps";
import { Maximize2, Hand } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MapViewProps {
  latitude: number;
  longitude: number;
}

const containerStyle = {
  width: "100%",
  height: "100%", // Inherit from parent container
  borderRadius: "1rem",
};

// Custom style to desaturate map, hide POIs, and reduce brightness
const minimalMapStyle = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ saturation: -80 }, { lightness: 0 }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "simplified" }, { lightness: 20 }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e9e9e9" }, { lightness: 17 }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }, { lightness: 20 }],
  },
];

export default function MapView({ latitude, longitude }: MapViewProps) {
  const { isLoaded } = useGoogleMapsLoader();
  const [isInteractable, setIsInteractable] = useState(false);

  const center = useMemo(() => ({
    lat: !isNaN(latitude) ? latitude : 0,
    lng: !isNaN(longitude) ? longitude : 0,
  }), [latitude, longitude]);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true, // Hides Zoom, StreetView, MapType controls
    zoomControl: false,
    gestureHandling: isInteractable ? "cooperative" : "none", // Prevents scroll hijacking until active
    styles: minimalMapStyle,
    clickableIcons: false, // Prevents clicking on POIs
  }), [isInteractable]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-100 group">
      {isLoaded ? (
        <>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={15}
            options={mapOptions}
          >
            <Marker position={center} />
          </GoogleMap>

          {/* Interactive Overlay - Prevents scrolling until clicked */}
          <AnimatePresence>
            {!isInteractable && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsInteractable(true)}
                className="absolute inset-0 bg-black/5 z-10 flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10"
              >
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-white/50 flex items-center gap-2 text-slate-700 font-medium text-sm transform transition-transform group-hover:scale-105">
                  <Hand className="w-4 h-4" />
                  <span>Tap to move map</span>
                </div>

                {/* Corner Expand Icon */}
                <div className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm text-slate-600">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 animate-pulse">
          <span className="text-sm font-medium">Loading map...</span>
        </div>
      )}
    </div>
  );
}