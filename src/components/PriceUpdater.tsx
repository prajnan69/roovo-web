"use client";

import RoovoLoader from "@/components/RoovoLoader";

interface Listing {
  id: string;
  title: string;
  price_per_night: number;
  weekend_price: number;
  primary_image_url: string;
}

interface PriceUpdaterProps {
  selectedListing: Listing | null;
  price: number;
  setPrice: (price: number) => void;
  weekendPercentage: number;
  setWeekendPercentage: (percentage: number) => void;
  handlePriceSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

const PriceUpdater = ({
  selectedListing,
  price,
  setPrice,
  weekendPercentage,
  setWeekendPercentage,
  handlePriceSave,
  isSaving,
  saveSuccess,
}: PriceUpdaterProps) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/20 flex flex-col h-full">
      {selectedListing && (
        <div className="mb-6">
          <img src={selectedListing.primary_image_url} alt={selectedListing.title} className="w-full h-32 object-cover rounded-xl mb-4" />
          <h2 className="text-xl font-bold tracking-tight truncate">{selectedListing.title}</h2>
        </div>
      )}
      <div className="flex-grow">
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-300">Base Price (per night)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">₹</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full bg-white/10 rounded-full p-3 pl-8 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-300">Weekend Price Increase</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={weekendPercentage}
              onChange={(e) => setWeekendPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-lg font-semibold w-16 text-center">{weekendPercentage}%</span>
          </div>
          <div className="text-right mt-2 text-gray-400 text-sm">
            Weekend: <span className="font-bold text-white">₹{(price * (1 + weekendPercentage / 100)).toFixed(0)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={handlePriceSave}
        className={`bg-indigo-500 text-white font-bold py-3 px-4 rounded-full w-full transition-all duration-300 mt-auto flex items-center justify-center
          ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-600 hover:scale-105'}
          ${saveSuccess ? 'bg-green-500' : ''}
        `}
        disabled={isSaving}
      >
        {isSaving ? (
          <RoovoLoader />
        ) : saveSuccess ? (
          'Saved!'
        ) : (
          'Save Prices'
        )}
      </button>
    </div>
  );
};

export default PriceUpdater;
