"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { useGoogleMapsLoader } from '@/lib/googleMaps';
import { KARNATAKA_CENTER } from '@/data/karnatakaDistricts';
import { useDestinationAreas, type AreaDistrict } from '@/hooks/useDestinationAreas';

export interface PlaceSelection {
  name: string;
  lat?: number;
  lng?: number;
}

interface DestinationStepProps {
  selectedName: string | null;
  onSelectPlace: (place: PlaceSelection) => void;
}

// Each district card gets its own accent so the list reads as a set of places
// rather than a wall of identical rows. Indigo stays the brand/active colour.
const ACCENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-sky-500 to-blue-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
];

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

const DestinationStep: React.FC<DestinationStepProps> = ({ selectedName, onSelectPlace }) => {
  const { districts, comingSoon, loading } = useDestinationAreas();
  const { isLoaded } = useGoogleMapsLoader();

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [openDistrict, setOpenDistrict] = useState<AreaDistrict | null>(null);

  useEffect(() => {
    let active = true;
    if (!isLoaded || !query.trim()) {
      setPredictions([]);
      return;
    }
    const run = async () => {
      try {
        const { AutocompleteService, AutocompleteSessionToken, PlacesServiceStatus } =
          (await window.google.maps.importLibrary('places')) as any;
        const service = new AutocompleteService();
        service.getPlacePredictions(
          {
            input: `${query}, Karnataka`,
            componentRestrictions: { country: 'in' },
            locationBias: { radius: 400000, center: KARNATAKA_CENTER },
            sessionToken: new AutocompleteSessionToken(),
          },
          (results: google.maps.places.AutocompletePrediction[] | null, status: string) => {
            if (!active) return;
            setPredictions(
              status === PlacesServiceStatus.OK && results
                ? results.filter((p) => p.description.toLowerCase().includes('karnataka'))
                : []
            );
          }
        );
      } catch (error) {
        console.error('Places lookup failed:', error);
      }
    };
    // Debounced: typing fires a request per keystroke otherwise.
    const timer = setTimeout(run, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, isLoaded]);

  const pick = (place: PlaceSelection) => {
    triggerHaptic();
    onSelectPlace(place);
  };

  return (
    <div className="px-4 pb-8">
      <h2 className="text-[26px] font-black text-slate-900 tracking-tight pt-5 pb-4 leading-tight">
        Where to?
      </h2>

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-slate-100 rounded-2xl px-4 h-[52px] focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/25 focus-within:shadow-sm transition-all">
        <Search className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city or area"
          className="flex-1 bg-transparent outline-none text-[15px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 rounded-full active:bg-slate-200 flex-shrink-0"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* --- Search results --- */}
        {query.trim() ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mt-4 flex flex-col"
          >
            {predictions.length === 0 ? (
              <p className="text-[13px] text-slate-400 font-medium py-6 text-center">
                No matches in Karnataka yet.
              </p>
            ) : (
              predictions.map((p) => (
                <button
                  key={p.place_id}
                  onClick={() => pick({ name: p.structured_formatting.main_text })}
                  className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0 text-left active:bg-slate-50 -mx-2 px-2 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-slate-900 truncate">
                      {p.structured_formatting.main_text}
                    </p>
                    <p className="text-[12px] text-slate-500 truncate">
                      {p.structured_formatting.secondary_text}
                    </p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        ) : openDistrict ? (
          /* --- Cities inside a district --- */
          <motion.div
            key="cities"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="mt-5"
          >
            <button
              onClick={() => {
                triggerHaptic();
                setOpenDistrict(null);
              }}
              className="flex items-center gap-1.5 mb-4 text-slate-600 active:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[13px] font-bold">All districts</span>
            </button>

            <h3 className="text-[18px] font-black text-slate-900 tracking-tight">{openDistrict.name}</h3>
            <p className="text-[12px] text-slate-500 font-medium mb-4">
              {openDistrict.count} {openDistrict.count === 1 ? 'stay' : 'stays'}
            </p>

            <button
              onClick={() => pick({ name: openDistrict.name, lat: openDistrict.lat, lng: openDistrict.lng })}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 mb-2 text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Compass className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-900">Anywhere in {openDistrict.name}</p>
                <p className="text-[12px] text-slate-500">Browse the whole district</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>

            {openDistrict.cities.map((city, i) => (
              <motion.button
                key={city.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i, 6) * 0.03, ease: EASE }}
                onClick={() => pick({ name: city.name, lat: city.lat, lng: city.lng })}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 mb-2 text-left active:scale-[0.99] active:bg-slate-50 transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-slate-900 truncate">{city.name}</p>
                  <p className="text-[12px] text-slate-500">
                    {city.count} {city.count === 1 ? 'stay' : 'stays'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          /* --- District browse --- */
          <motion.div
            key="districts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mt-6"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Available now
            </p>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[104px] rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : districts.length === 0 ? (
              <p className="text-[13px] text-slate-400 font-medium py-6">No stays listed yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {districts.map((district, i) => {
                  const active = selectedName === district.name;
                  return (
                    <motion.button
                      key={district.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: Math.min(i, 6) * 0.04, ease: EASE }}
                      onClick={() => {
                        triggerHaptic();
                        setOpenDistrict(district);
                      }}
                      className={`relative h-[104px] rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform ${
                        active ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${ACCENTS[i % ACCENTS.length]}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <div className="absolute top-2.5 right-2.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-white/95 flex items-center justify-center">
                        <span className="text-[11px] font-black text-slate-900">{district.count}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white font-black text-[14px] leading-tight tracking-tight drop-shadow-sm">
                          {district.name}
                        </p>
                        <p className="text-white/80 text-[11px] font-semibold">
                          {district.cities.length} {district.cities.length === 1 ? 'area' : 'areas'}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {comingSoon.length > 0 && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-7 mb-3">
                  Coming soon
                </p>
                <div className="flex flex-wrap gap-2 pb-2">
                  {comingSoon.map((d) => (
                    <span
                      key={d.name}
                      className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 text-[12px] font-semibold"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DestinationStep;
