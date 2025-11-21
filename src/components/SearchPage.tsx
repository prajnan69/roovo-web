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

export default function SearchPage() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const { navigate, back, search } = useNavigation();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      try {
        const currentParams = new URLSearchParams(search);
        const searchParams = {
          location: currentParams.get('location') || undefined,
          checkIn: currentParams.get('checkIn') ? new Date(currentParams.get('checkIn')!) : null,
          checkOut: currentParams.get('checkOut') ? new Date(currentParams.get('checkOut')!) : null,
          guests: currentParams.get('guests') ? parseInt(currentParams.get('guests')!) : 0,
          pets: currentParams.get('pets') ? parseInt(currentParams.get('pets')!) : 0,
          lat: currentParams.get('lat') ? parseFloat(currentParams.get('lat')!) : undefined,
          lng: currentParams.get('lng') ? parseFloat(currentParams.get('lng')!) : undefined,
        };

        const results = await searchListings(searchParams);
        setListings(results || []);
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

  return (
    <>
      <div className="h-screen flex flex-col bg-white">
        {/* Header */}
        <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-50">
          <button onClick={() => back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        <div className="flex-1 mx-4 bg-white shadow-sm border border-slate-200 rounded-full px-4 py-2.5 flex items-center text-sm font-medium text-slate-700 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setIsModalOpen(true)}>
             <div className="flex-1 truncate flex items-center">
                <span className="font-semibold text-slate-900">{location}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="truncate">{dateText}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-600">{guestsText}</span>
             </div>
             <div className="p-1.5 bg-slate-900 rounded-full text-white ml-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow overflow-hidden relative bg-white">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RoovoLoader />
            </div>
          ) : view === 'list' ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6 md:px-8">
              {listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 pb-24 max-w-7xl mx-auto">
                  {listings.map((listing) => (
                    <ListingCard 
                      key={listing.id}
                      listing={listing} 
                      onImageLoad={() => {}}
                      variant="search"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No matches found</h3>
                  <p className="text-sm text-slate-500">Try adjusting your search area or filters.</p>
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
            <button
              onClick={() => setView(view === 'list' ? 'map' : 'list')}
              className="bg-slate-900 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
            >
              {view === 'list' ? (
                <>
                  Map
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" /></svg>
                </>
              ) : (
                <>
                  List
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </>
              )}
            </button>
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
