"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { triggerHaptic } from '@/lib/haptics';
import { useBackCloseable } from '@/hooks/useBackCloseable';
import DestinationStep from './DestinationStep';
import DatesStep from './DatesStep';
import GuestsStep from './GuestsStep';

export type SearchStep = 'where' | 'when' | 'who';
const STEP_ORDER: SearchStep[] = ['where', 'when', 'who'];

export interface SearchFlowProps {
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

// One shared motion language for the whole flow. Transform + opacity only, no
// `layout` anywhere: the previous accordion animated its own height while its
// children ran their own layout animations, and those fought each other every
// time a section opened — that was the jank.
const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.26, ease: EASE } },
  exit: (dir: number) => ({ x: dir > 0 ? -28 : 28, opacity: 0, transition: { duration: 0.18, ease: EASE } }),
};

const SearchFlow: React.FC<SearchFlowProps> = ({
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
  const [isVisible, setIsVisible] = useState(isOpen);
  const [step, setStep] = useState<SearchStep>('where');
  const [direction, setDirection] = useState(1);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFlexible, setIsFlexible] = useState(false);
  const [freeTextQuery, setFreeTextQuery] = useState('');

  const { navigate } = useNavigation();

  useEffect(() => {
    setIsVisible(isOpen);
    if (isOpen) setStep('where');
  }, [isOpen]);

  const close = () => {
    triggerHaptic();
    setIsVisible(false);
  };

  // Android hardware back closes the sheet rather than leaving the page.
  useBackCloseable(isVisible, close);

  const goToStep = (next: SearchStep) => {
    if (next === step) return;
    triggerHaptic();
    setDirection(STEP_ORDER.indexOf(next) > STEP_ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  };

  const hasDestination = selectedCity.name !== 'Anywhere' || !!freeTextQuery;

  const runSearch = () => {
    triggerHaptic();
    const params = new URLSearchParams();

    const finish = (lat?: number, lng?: number) => {
      if (freeTextQuery) params.append('location', freeTextQuery);
      else if (selectedCity.name !== 'Anywhere') params.append('location', selectedCity.name);

      if (lat && lng) {
        params.append('lat', String(lat));
        params.append('lng', String(lng));
      }

      if (isFlexible) {
        params.append('flexible', '1');
      } else {
        if (dates.checkIn) params.append('checkIn', dates.checkIn.toISOString());
        if (dates.checkOut) params.append('checkOut', dates.checkOut.toISOString());
      }

      const totalGuests = adults + childrenState;
      if (totalGuests > 0) params.append('guests', String(totalGuests));
      if (pets > 0) params.append('pets', String(pets));

      navigate(`/search?${params.toString()}`);
      close();
    };

    // A destination chosen from the list already carries exact coordinates
    // (averaged from real listing positions) — no geocoding round-trip needed.
    if (!freeTextQuery && coords) {
      finish(coords.lat, coords.lng);
      return;
    }

    const address = freeTextQuery || selectedCity.name;
    if (address && address !== 'Anywhere' && window.google) {
      new window.google.maps.Geocoder().geocode(
        { address: `${address}, Karnataka, India` },
        (results, status) => {
          if (status === 'OK' && results?.[0]) {
            finish(results[0].geometry.location.lat(), results[0].geometry.location.lng());
          } else {
            finish();
          }
        }
      );
    } else {
      finish();
    }
  };

  const handleSelectPlace = (place: { name: string; lat?: number; lng?: number }) => {
    setSelectedCity({ name: place.name, img: '' });
    setCoords(place.lat && place.lng ? { lat: place.lat, lng: place.lng } : null);
    setFreeTextQuery(place.lat && place.lng ? '' : place.name);
    setDirection(1);
    setStep('when');
  };

  const clearAll = () => {
    triggerHaptic();
    setSelectedCity({ name: 'Anywhere', img: '' });
    setCoords(null);
    setFreeTextQuery('');
    setDates({ checkIn: null, checkOut: null });
    setIsFlexible(false);
    setAdults(0);
    setChildrenState(0);
    setPets(0);
  };

  const dateSummary = isFlexible
    ? 'Flexible'
    : dates.checkIn
      ? `${dates.checkIn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${dates.checkOut ? ` – ${dates.checkOut.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`
      : 'Any dates';

  const guestTotal = adults + childrenState;
  const guestSummary = guestTotal > 0 ? `${guestTotal} guest${guestTotal > 1 ? 's' : ''}` : 'Any';

  const chips: { key: SearchStep; label: string; value: string }[] = [
    { key: 'where', label: 'Where', value: hasDestination ? (freeTextQuery || selectedCity.name) : 'Anywhere' },
    { key: 'when', label: 'When', value: dateSummary },
    { key: 'who', label: 'Who', value: guestSummary },
  ];

  const isLastStep = step === 'who';

  return (
    <AnimatePresence onExitComplete={onClose}>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.34, ease: EASE }}
          className="fixed inset-0 z-[60] flex flex-col bg-white"
          style={{ willChange: 'transform' }}
        >
          {/* Header */}
          <div className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 flex items-center gap-3 border-b border-slate-100">
            <button
              onClick={close}
              className="p-2 -ml-2 rounded-full active:bg-slate-100 active:scale-90 transition-transform"
              aria-label="Close search"
            >
              <X className="w-5 h-5 text-slate-800" />
            </button>
            <div className="flex-1 flex items-center gap-1.5">
              {STEP_ORDER.map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    s === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={clearAll}
              className="text-[13px] font-semibold text-slate-500 active:text-slate-900 px-1"
            >
              Clear
            </button>
          </div>

          {/* Tappable summary — lets people jump straight to any step instead of
              collapsing/expanding accordion rows to get there. */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-slate-100">
            {chips.map((chip) => {
              const active = chip.key === step;
              return (
                <button
                  key={chip.key}
                  onClick={() => goToStep(chip.key)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full border text-left transition-colors ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/15'
                      : 'border-slate-200 bg-white active:bg-slate-50'
                  }`}
                >
                  <span className={`block text-[9px] font-bold uppercase tracking-widest ${active ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {chip.label}
                  </span>
                  <span className={`block text-[13px] font-bold leading-tight truncate max-w-[128px] ${active ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {chip.value}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Step body */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 overflow-y-auto scrollbar-hide"
              >
                {step === 'where' && (
                  <DestinationStep
                    selectedName={hasDestination ? (freeTextQuery || selectedCity.name) : null}
                    onSelectPlace={handleSelectPlace}
                  />
                )}
                {step === 'when' && (
                  <DatesStep
                    dates={dates}
                    setDates={setDates}
                    isFlexible={isFlexible}
                    setIsFlexible={setIsFlexible}
                    destinationName={hasDestination ? (freeTextQuery || selectedCity.name) : null}
                  />
                )}
                {step === 'who' && (
                  <GuestsStep
                    adults={adults}
                    setAdults={setAdults}
                    childrenState={childrenState}
                    setChildrenState={setChildrenState}
                    pets={pets}
                    setPets={setPets}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div
            className="px-4 pt-3 border-t border-slate-100 bg-white flex items-center gap-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            {!isLastStep && (
              <button
                onClick={runSearch}
                className="text-[14px] font-bold text-slate-600 active:text-slate-900 px-2 py-3"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) runSearch();
                else goToStep(step === 'where' ? 'when' : 'who');
              }}
              disabled={step === 'where' && !hasDestination}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-[15px] shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none"
            >
              {isLastStep ? 'Search' : 'Continue'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchFlow;
