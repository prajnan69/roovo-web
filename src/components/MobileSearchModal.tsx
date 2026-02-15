"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../lib/haptics';
import { useGoogleMapsLoader } from '../lib/googleMaps';
import { useNavigation } from '../hooks/useNavigation';
import MobileWhere from './MobileWhere';
import MobileWhen from './MobileWhen';
import MobileWho from './MobileWho';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: { name: string; img: string };
  setSelectedCity: (city: { name: string; img: string }) => void;
  dates: { checkIn: Date | null; checkOut: Date | null };
  setDates: (dates: { checkIn: Date | null; checkOut: Date | null }) => void;
  adults: number;
  setAdults: (n: number) => void;
  childrenState: number;
  setChildrenState: (n: number) => void;
  pets: number;
  setPets: (n: number) => void;
}

const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  setSelectedCity,
  dates,
  setDates,
  adults,
  setAdults,
  childrenState,
  setChildrenState,
  pets,
  setPets,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [activeSection, setActiveSection] = useState<'where' | 'when' | 'who'>('where');

  const { navigate } = useNavigation();

  const { isLoaded } = useGoogleMapsLoader();

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    let active = true;

    const fetchPredictions = async () => {
      if (isLoaded && searchQuery) {
        try {
          // Import the Places library dynamically to ensure we use the latest version available
          const { AutocompleteService, AutocompleteSessionToken, PlacesServiceStatus } = await window.google.maps.importLibrary("places") as any;

          const service = new AutocompleteService();
          const sessionToken = new AutocompleteSessionToken();

          service.getPlacePredictions(
            {
              input: `${searchQuery} in Bengaluru`,
              componentRestrictions: { country: 'in' },
              locationBias: {
                radius: 50000,
                center: { lat: 12.9716, lng: 77.5946 },
              },
              sessionToken: sessionToken,
            },
            (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
              if (!active) return;
              // Check status against the imported enum or the global one
              if (status === PlacesServiceStatus.OK && predictions) {
                const filteredPredictions = predictions.filter(p =>
                  p.description.toLowerCase().includes('bengaluru') ||
                  p.description.toLowerCase().includes('bangalore')
                );
                setSearchResults(filteredPredictions);
              }
            }
          );
        } catch (error) {
          console.error("Error using Google Maps Places library:", error);
        }
      } else {
        setSearchResults([]);
      }
    };

    fetchPredictions();

    return () => {
      active = false;
    };
  }, [searchQuery, isLoaded]);

  const isBengaluru = selectedCity.name === 'Bengaluru';

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    const buildParamsAndNavigate = (lat?: number, lng?: number) => {
      // Prioritize the specific area typed by the user
      if (searchQuery) {
        params.append('location', searchQuery);
      } else if (selectedCity.name !== 'Anywhere') {
        params.append('location', selectedCity.name);
      }

      if (lat && lng) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
      }

      if (dates.checkIn) params.append('checkIn', dates.checkIn.toISOString());
      if (dates.checkOut) params.append('checkOut', dates.checkOut.toISOString());

      const totalGuests = adults + childrenState;
      if (totalGuests > 0) params.append('guests', totalGuests.toString());
      if (pets > 0) params.append('pets', pets.toString());

      navigate(`/search?${params.toString()}`);
      handleClose();
    };

    const geocodeAndSearch = (address: string) => {
      if (window.google) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            buildParamsAndNavigate(lat, lng);
          } else {
            // Fallback if geocoding fails, search by location name
            buildParamsAndNavigate();
          }
        });
      } else {
        // Fallback if google maps is not loaded
        buildParamsAndNavigate();
      }
    };

    if (searchQuery) {
      geocodeAndSearch(searchQuery + ", " + selectedCity.name);
    } else if (selectedCity.name !== 'Anywhere') {
      geocodeAndSearch(selectedCity.name);
    } else {
      buildParamsAndNavigate();
    }
  };

  const toggleSection = (section: 'where' | 'when' | 'who') => {
    if (activeSection !== section) {
      triggerHaptic();
      setActiveSection(section);
    }
  };

  // Helper to format header summary text
  const getHeaderSummary = () => {
    const totalGuests = adults + childrenState;
    const dateText = dates.checkIn
      ? `${dates.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'Dates';
    const guestText = totalGuests > 0 ? `${totalGuests} Guest${totalGuests > 1 ? 's' : ''}` : 'Guests';

    return (
      <div className="flex flex-col items-center">
        <span className="font-bold text-slate-900 text-sm">Stays</span>
        <span className="text-xs text-slate-500 font-medium mt-0.5">
          {selectedCity.name !== 'Anywhere' ? selectedCity.name : 'Anywhere'} • {dateText} • {guestText}
        </span>
      </div>
    );
  };

  // Animation configs
  const sectionTransition = { type: "tween" as const, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
  const contentAnimation = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence onExitComplete={onClose}>
      {isVisible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 bg-slate-50 z-50 flex flex-col"
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] z-10">
            <motion.button
              onClick={handleClose}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </motion.button>

            {/* Central Summary Information */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              {getHeaderSummary()}
            </motion.div>

            <div className="w-10"></div> {/* Spacer for center alignment */}
          </header>

          <main className="flex-grow overflow-y-auto px-3 pt-6 pb-32 space-y-3">

            {/* Where Section */}
            <motion.div
              layout
              transition={sectionTransition}
              onClick={() => toggleSection('where')}
              className={`relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${activeSection === 'where' ? 'p-5 ring-2 ring-indigo-500 ring-opacity-10' : 'p-4 flex items-center justify-between cursor-pointer'}`}
            >
              <AnimatePresence mode='popLayout'>
                {activeSection === 'where' ? (
                  <motion.div
                    key="where-expanded"
                    variants={contentAnimation}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-5"
                  >
                    {/* Always render but control visibility with opacity and pointer-events */}
                    <motion.div
                      animate={{
                        opacity: searchQuery.length === 0 ? 1 : 0,
                        height: searchQuery.length === 0 ? 'auto' : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className={searchQuery.length > 0 ? 'pointer-events-none overflow-hidden' : ''}
                    >
                      <h3 className="text-2xl font-bold text-slate-900 mb-5">Where to?</h3>
                      <MobileWhere selectedCity={selectedCity} setSelectedCity={setSelectedCity} />
                    </motion.div>

                    {/* Search Bar for Bengaluru */}
                    {isBengaluru && (
                      <div className="relative">
                        {/* Animate search bar to top when typing */}
                        <motion.div
                          layout
                          className="flex items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-md transition-all duration-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                            }}
                            placeholder="Search area (e.g. Indiranagar)"
                            className="bg-transparent w-full outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="p-1 rounded-full hover:bg-slate-200 transition-colors flex-shrink-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </motion.div>

                        {/* Popular Areas Pills */}
                        {!searchQuery && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mt-3 flex flex-wrap gap-2"
                          >
                            {['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'MG Road', 'JP Nagar', 'Jayanagar'].map((area) => (
                              <button
                                key={area}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchQuery(area);
                                  setActiveSection('when');
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors shadow-sm"
                              >
                                {area}
                              </button>
                            ))}
                          </motion.div>
                        )}

                        {/* Dropdown Results */}
                        <AnimatePresence>
                          {searchQuery.length > 0 && searchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                              className="mt-3 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto"
                            >
                              {searchResults.map((result, index) => (
                                <motion.div
                                  key={result.place_id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                                  className="p-4 active:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery(result.description);
                                    setActiveSection('when');
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-2 bg-indigo-50 rounded-full">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-slate-900 text-sm">{result.structured_formatting.main_text}</div>
                                      <div className="text-slate-500 text-xs mt-0.5 truncate">{result.structured_formatting.secondary_text}</div>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="where-collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between w-full items-center"
                  >
                    <span className="text-slate-500 font-medium text-sm">Where</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedCity.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* When Section */}
            <motion.div
              layout
              transition={sectionTransition}
              onClick={() => toggleSection('when')}
              className={`relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${activeSection === 'when' ? 'p-5 ring-2 ring-indigo-500 ring-opacity-10' : 'p-4 flex items-center justify-between cursor-pointer'}`}
            >
              <AnimatePresence mode='popLayout'>
                {activeSection === 'when' ? (
                  <motion.div
                    key="when-expanded"
                    variants={contentAnimation}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-5"
                  >
                    <h3 className="text-2xl font-bold text-slate-900">When's your trip?</h3>
                    <MobileWhen dates={dates} setDates={setDates} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="when-collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between w-full items-center"
                  >
                    <span className="text-slate-500 font-medium text-sm">When</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {dates.checkIn ? `${dates.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dates.checkOut ? dates.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'}` : 'Add dates'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Who Section */}
            <motion.div
              layout
              transition={sectionTransition}
              onClick={() => toggleSection('who')}
              className={`relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${activeSection === 'who' ? 'p-5 ring-2 ring-indigo-500 ring-opacity-10' : 'p-4 flex items-center justify-between cursor-pointer'}`}
            >
              <AnimatePresence mode='popLayout'>
                {activeSection === 'who' ? (
                  <motion.div
                    key="who-expanded"
                    variants={contentAnimation}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-5"
                  >
                    <h3 className="text-2xl font-bold text-slate-900">Who's coming?</h3>
                    <MobileWho
                      adults={adults}
                      setAdults={setAdults}
                      childrenState={childrenState}
                      setChildrenState={setChildrenState}
                      pets={pets}
                      setPets={setPets}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="who-collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between w-full items-center"
                  >
                    <span className="text-slate-500 font-medium text-sm">Who</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {adults + childrenState > 0 ? `${adults + childrenState} guests` : 'Add guests'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          </main>

          {/* Footer */}
          <motion.footer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-between items-center z-50"
          >
            <button
              onClick={() => {
                setDates({ checkIn: null, checkOut: null });
                setAdults(0);
                setChildrenState(0);
                setPets(0);
                setSelectedCity({ name: "Anywhere", img: "/bengaluru.png" });
              }}
              className="text-slate-900 font-bold underline text-sm px-4"
            >
              Clear all
            </button>

            <button
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Search
            </button>
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileSearchModal;
