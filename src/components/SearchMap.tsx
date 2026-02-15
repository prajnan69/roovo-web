"use client";

import React, { useState } from 'react';
import { GoogleMap, OverlayView } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../lib/googleMaps";
import { useNavigation } from '../hooks/useNavigation';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchListing {
  id: number;
  latitude: number;
  longitude: number;
  price_per_night: number;
  title: string;
  primary_image_url?: string;
}

interface SearchMapProps {
  listings: any[];
}

const containerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "12px",
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

export default function SearchMap({ listings }: SearchMapProps) {
  const { isLoaded } = useGoogleMapsLoader();
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const { navigate } = useNavigation();

  // Safely access latitude/longitude assuming they might be at top level or nested
  const getLat = (l: any) => l.latitude || l.location_and_neighborhood?.latitude;
  const getLng = (l: any) => l.longitude || l.location_and_neighborhood?.longitude;

  const firstListing = listings.find(l => getLat(l) && getLng(l));
  const center = firstListing
    ? { lat: getLat(firstListing), lng: getLng(firstListing) }
    : defaultCenter;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-slate-100 rounded-xl text-slate-500">
        Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapId: "4f383356f3a440",
        clickableIcons: false,
      }}
    >
      {listings.map((listing) => {
        const lat = getLat(listing);
        const lng = getLng(listing);
        const isSelected = selectedListing?.id === listing.id;

        return lat && lng && (
          <OverlayView
            key={listing.id}
            position={{ lat, lng }}
            mapPaneName="overlayMouseTarget"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedListing(listing);
              }}
              className={`
                relative cursor-pointer transform transition-all duration-200 flex flex-col items-center
                ${isSelected ? 'z-50 scale-110' : 'z-10 hover:z-40 hover:scale-105'}
              `}
            >
              <div
                className={`
                  px-3 py-1.5 rounded-full font-bold text-sm shadow-lg border border-slate-200/50 transition-colors whitespace-nowrap min-w-[60px] text-center flex items-center justify-center
                  ${isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-900 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}
                `}
              >
                ₹{listing.price_per_night}
              </div>
              {/* Triangle pointing down */}
              <div
                className={`
                  w-2 h-2 rotate-45 border-r border-b border-slate-200/50 -mt-1
                  ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}
                `}
              ></div>
            </div>
          </OverlayView>
        );
      })}

      <AnimatePresence>
        {selectedListing && getLat(selectedListing) && getLng(selectedListing) && (
          <OverlayView
            position={{ lat: getLat(selectedListing), lng: getLng(selectedListing) }}
            mapPaneName="floatPane"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute -translate-x-1/2 bottom-12 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden cursor-pointer group z-50"
              onClick={() => navigate(`/listing/${selectedListing.id}`)}
            >
              <div className="relative h-40">
                <img
                  src={selectedListing.primary_image_url}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedListing(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-block px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-indigo-600 shadow-sm">
                    ₹{selectedListing.price_per_night}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 text-sm">
                    {selectedListing.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    4.9
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Bengaluru, India
                </div>
              </div>

              {/* Pointer arrow */}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-4 h-4 bg-white shadow-sm z-[-1]"></div>
            </motion.div>
          </OverlayView>
        )}
      </AnimatePresence>
    </GoogleMap>
  );
}
