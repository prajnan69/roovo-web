"use client";

import React, { useState } from 'react';
import { GoogleMap, OverlayView, InfoWindow } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../lib/googleMaps";
import { useNavigation } from '../hooks/useNavigation';

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
        mapId: "4f383356f3a440", // Map ID is required for some advanced markers, using a placeholder or user's if available. 
        // If no mapId is provided, default styles apply.
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
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedListing(listing);
              }}
              className={`
                relative cursor-pointer transform transition-all duration-200
                ${isSelected ? 'z-50 scale-110' : 'z-10 hover:z-40 hover:scale-105'}
              `}
            >
              <div 
                className={`
                  px-3 py-1.5 rounded-full font-bold text-sm shadow-md border border-slate-200/50
                  ${isSelected 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-900 hover:bg-slate-50'}
                `}
              >
                ₹{listing.price_per_night}
              </div>
              {/* Triangle pointing down */}
              <div 
                className={`
                  absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45
                  ${isSelected ? 'bg-slate-900' : 'bg-white'}
                `}
              ></div>
            </div>
          </OverlayView>
        );
      })}

      {selectedListing && getLat(selectedListing) && getLng(selectedListing) && (
        <InfoWindow
          position={{ lat: getLat(selectedListing), lng: getLng(selectedListing) }}
          onCloseClick={() => setSelectedListing(null)}
        >
          <div 
            className="w-48 cursor-pointer"
            onClick={() => navigate(`/listing/${selectedListing.id}`)}
          >
            <img 
              src={selectedListing.primary_image_url} 
              alt={selectedListing.title} 
              className="w-full h-32 object-cover rounded-lg mb-2"
            />
            <h3 className="font-bold text-sm text-slate-900 truncate">{selectedListing.title}</h3>
            <p className="text-indigo-600 font-bold text-sm">₹{selectedListing.price_per_night} <span className="text-slate-500 font-normal">/ night</span></p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
