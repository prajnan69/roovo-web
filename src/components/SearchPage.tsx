"use client";

import React, { useState, useEffect } from 'react';
import { searchListings } from '@/services/api';
import ListingCard from './ListingCard';
import SearchMap from './SearchMap';
import RoovoLoader from './RoovoLoader';
import { motion } from 'framer-motion';
import type { ListingData } from '@/types';
import { useNavigation } from '@/hooks/useNavigation';
import MobileSearchModal from './MobileSearchModal';

import { getDistanceFromLatLonInKm } from '@/lib/utils';

export default function SearchPage() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const { navigate, back, search } = useNavigation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRadiusSearchFailed, setIsRadiusSearchFailed] = useState(false);

  // Initialize state from URL params
  const params = new URLSearchParams(search);
  const [selectedCity, setSelectedCity] = useState({ name: params.get('location') || 'Anywhere', img: '' });
  const [dates, setDates] = useState<{ checkIn: Date | null; checkOut: Date | null }>({
    checkIn: params.get('checkIn') ? new Date(params.get('checkIn')!) : null,
    checkOut: params.get('checkOut') ? new Date(params.get('checkOut')!) : null,
  });

  const guestsParam = params.get('guests');
  const [adults, setAdults] = useState(guestsParam ? parseInt(guestsParam) : 0);
  const [childrenState, setChildrenState] = useState(0);
  const [pets, setPets] = useState(params.get('pets') ? parseInt(params.get('pets')!) : 0);


  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      setIsRadiusSearchFailed(false);
      try {
        const currentParams = new URLSearchParams(search);
        const searchLat = currentParams.get('lat') ? parseFloat(currentParams.get('lat')!) : undefined;
        const searchLng = currentParams.get('lng') ? parseFloat(currentParams.get('lng')!) : undefined;

        const searchParams = {
          location: currentParams.get('location') || undefined,
          checkIn: currentParams.get('checkIn') ? new Date(currentParams.get('checkIn')!) : null,
          checkOut: currentParams.get('checkOut') ? new Date(currentParams.get('checkOut')!) : null,
          guests: currentParams.get('guests') ? parseInt(currentParams.get('guests')!) : 0,
          pets: currentParams.get('pets') ? parseInt(currentParams.get('pets')!) : 0,
          lat: searchLat,
          lng: searchLng,
        };

        let results = await searchListings(searchParams) || [];

        // If we have specific coordinates, filter by radius
        if (searchLat && searchLng) {
          // Calculate distance for all listings
          const resultsWithDistance = results.map((listing: any) => {
            // Handle different structure of listing object if needed, using fallbacks like ListingCard
            // Cast to any because typescript types are messy as found earlier
            const lLat = listing.latitude || listing.location?.latitude || listing.location_and_neighborhood?.latitude;
            const lLng = listing.longitude || listing.location?.longitude || listing.location_and_neighborhood?.longitude;

            if (lLat && lLng) {
              return {
                ...listing,
                _distance: getDistanceFromLatLonInKm(searchLat, searchLng, parseFloat(lLat), parseFloat(lLng))
              };
            }
            return { ...listing, _distance: Infinity };
          });

          // Filter for listings within 20km
          const nearbyListings = resultsWithDistance.filter((l: any) => l._distance <= 20);

          if (nearbyListings.length > 0) {
            setListings(nearbyListings.sort((a: any, b: any) => a._distance - b._distance));
          } else {
            // No listings found in 20km radius
            setIsRadiusSearchFailed(true);
            // Show all listings sorted by distance
            setListings(resultsWithDistance.sort((a: any, b: any) => a._distance - b._distance));
          }
        } else {
          setListings(results);
        }

      } catch (error) {
        console.error('Error searching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [search]);

  const location = selectedCity.name;
  const dateText = dates.checkIn && dates.checkOut
    ? `${dates.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dates.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Any week';

  const totalGuests = adults + childrenState;
  const guestsText = totalGuests > 0 ? `${totalGuests} ${totalGuests > 1 ? 'guests' : 'guest'}` : 'Add guests';

  // Get the actual searched area from URL params (not just city)
  const rawLocation = params.get('location') || location;
  // Extract just the area name (first part before comma)
  const searchedArea = rawLocation.split(',')[0].trim();

  const hasDateFilter = dates.checkIn && dates.checkOut;
  const hasGuestFilter = totalGuests > 0;

  return (
    <>
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] border-b border-slate-200 flex items-center gap-3 sticky top-0 bg-white z-50 shadow-sm">
          <button onClick={() => back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>

          {/* Search Criteria Display */}
          <div
            className="flex-1 min-w-0 bg-white shadow-sm border border-slate-200 rounded-full px-4 py-2.5 flex items-center gap-2 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="flex-1 min-w-0 flex items-center text-sm overflow-hidden">
              <span className="font-semibold text-slate-900 whitespace-nowrap">{searchedArea}</span>
              {hasDateFilter && (
                <>
                  <span className="text-slate-300 mx-2 flex-shrink-0">|</span>
                  <span className="text-slate-600 whitespace-nowrap truncate">{dateText}</span>
                </>
              )}
              {hasGuestFilter && (
                <>
                  <span className="text-slate-300 mx-2 flex-shrink-0">|</span>
                  <span className="text-slate-500 text-xs whitespace-nowrap truncate">{guestsText}</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow overflow-hidden relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-white">
              <RoovoLoader />
            </div>
          ) : view === 'list' ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6 md:px-8 bg-slate-50">
              {listings.length > 0 ? (
                <>
                  {isRadiusSearchFailed && (
                    <div className="max-w-7xl mx-auto mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h3 className="text-amber-800 font-semibold text-sm mb-1">No listings found in the searched area</h3>
                      <p className="text-amber-700 text-xs">Showing suggested nearby listings below, sorted by distance.</p>
                    </div>
                  )}
                  <div className="max-w-7xl mx-auto mb-4">
                    <h2 className="text-lg font-bold text-slate-900">
                      {listings.length} {listings.length > 1 ? 'stays' : 'stay'} found
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">{searchedArea} • {dateText}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 pb-24 max-w-7xl mx-auto">
                    {listings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onImageLoad={() => { }}
                        variant="search"
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white rounded-2xl shadow-sm mx-auto max-w-md mt-12">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No matches found</h3>
                  <p className="text-sm text-slate-500 text-center px-6">Try adjusting your search area or filters.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full">
              <SearchMap listings={listings} />
            </div>
          )}

          {/* Map Toggle Button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <motion.button
              onClick={() => setView(view === 'list' ? 'map' : 'list')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold shadow-xl flex items-center gap-2 transition-all hover:bg-indigo-700 hover:shadow-2xl"
            >
              {view === 'list' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" /></svg>
                  Map
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                  List
                </>
              )}
            </motion.button>
          </div>
        </main>
      </div>
      <MobileSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        dates={dates}
        setDates={setDates}
        adults={adults}
        setAdults={setAdults}
        childrenState={childrenState}
        setChildrenState={setChildrenState}
        pets={pets}
        setPets={setPets}
      />
    </>
  );
}
