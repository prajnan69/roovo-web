"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  X,
  Check,
  Minus,
  Plus,
  Clock,
  DollarSign,
  IndianRupee,
  Home,
  MapPin,
  Wifi,
  Utensils,
  Droplets,
  Wind,
  Tv,
  Car,
  Coffee,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Star,
  FileText,
  Info,
  Map
} from "lucide-react";

// --- Constants ---

const PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Villa",
  "Guest Suite",
  "Hotel",
  "Resort",
  "Cottage",
  "Bungalow",
  "Cabin",
  "Loft",
  "Farm stay",
  "Tiny home"
];

const AMENITIES_CATEGORIES = {
  "Essentials": [
    "Wifi", "Kitchen", "Air conditioning", "Heating", "Washer", "Dryer", "TV", "Iron", "Hair dryer", "Essentials"
  ],
  "Features": [
    "Pool", "Hot tub", "Patio", "BBQ grill", "Fire pit", "Pool table", "Indoor fireplace", "Outdoor dining area", "Exercise equipment"
  ],
  "Location": [
    "Beach access", "Lake access", "Ski-in/Ski-out", "Waterfront", "Mountain view"
  ],
  "Safety": [
    "Smoke alarm", "Carbon monoxide alarm", "Fire extinguisher", "First aid kit", "Lock on bedroom door"
  ],
  "Services": [
    "Self check-in", "Free parking", "Breakfast", "Cleaning before checkout", "Luggage dropoff allowed", "Long term stays allowed"
  ]
};

// Flattened list for search
const ALL_AMENITIES = Object.values(AMENITIES_CATEGORIES).flat();

// --- Helper Component: Auto-Resizing Textarea ---
const AutoResizeTextarea = ({ value, onChange, placeholder, className, minHeight = "100px" }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      style={{ minHeight, overflow: "hidden" }}
      rows={1}
    />
  );
};

export default function EditListingView({ listing, onClose, onSave }: { listing: any; onClose: () => void; onSave: (data: any) => void }) {
  // Local state for form handling
  const [formData, setFormData] = useState({
    ...listing,
    // Normalizing data structure
    guests: listing.guests || listing.max_guests || 1,
    checkIn: listing.booking_and_availability?.houseRules?.checkIn || "14:00",
    checkOut: listing.booking_and_availability?.houseRules?.checkOut || "11:00",
    // Ensure weekend_price is a number if it exists, otherwise null
    weekend_price: listing.weekend_price ? Number(listing.weekend_price) : null,
    price_per_night: Number(listing.price_per_night) || 0,
    included_amenities: listing.included_amenities || [],
    additional_rules: listing.additional_rules || "",
    guest_access: listing.guest_access || "",
    getting_around: listing.getting_around || "",
    neighborhood_description: listing.neighborhood_description || "",
    auto_bookable: listing.auto_bookable || false,
    pets_allowed: listing.pets_allowed || false,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState("");

  // Helper to update state
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleIncrement = (field: string, max: number = 100) => {
    const val = formData[field] || 0;
    if (val < max) updateField(field, val + 1);
  };

  const handleDecrement = (field: string, min: number = 0) => {
    const val = formData[field] || 0;
    if (val > min) updateField(field, val - 1);
  };

  const toggleAmenity = (amenity: string) => {
    const current = formData.included_amenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    updateField('included_amenities', updated);
  };

  // Filter amenities based on search
  const filteredAmenities = useMemo(() => {
    if (!amenitySearch) return AMENITIES_CATEGORIES;
    const filtered: Record<string, string[]> = {};
    Object.entries(AMENITIES_CATEGORIES).forEach(([category, items]) => {
      const matchingItems = items.filter(item =>
        item.toLowerCase().includes(amenitySearch.toLowerCase())
      );
      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });
    return filtered;
  }, [amenitySearch]);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col h-[100dvh]"
    >
      {/* --- Modern Header --- */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 pt-[calc(env(safe-area-inset-top)+1rem)] px-4 h-[60px] flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={24} />
        </button>

        <span className="text-base font-bold text-gray-900">Edit Listing</span>

        <button
          onClick={() => onSave(formData)}
          disabled={!hasChanges}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${hasChanges
            ? "bg-black text-white shadow-md hover:bg-gray-800 active:scale-95"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          Done
        </button>
      </div>

      {/* --- Scrollable Content --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32">

        {/* Title Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Property Details</label>
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 space-y-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full text-xl font-bold text-gray-900 placeholder-gray-300 outline-none bg-transparent border-b border-transparent focus:border-gray-200 transition-colors pb-1"
                placeholder="Ex: Cozy Beachfront Villa"
              />
            </div>

            {/* Custom Property Type Dropdown */}
            <div className="relative">
              <div
                className="flex items-center justify-between pt-2 cursor-pointer"
                onClick={() => setShowPropertyTypeDropdown(!showPropertyTypeDropdown)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Home size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Property Type</p>
                    <p className="text-xs text-gray-500">What kind of place is it?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 h-9">
                  <span className="text-sm font-medium text-gray-900">{formData.property_type || "Select"}</span>
                  {showPropertyTypeDropdown ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>
              </div>

              <AnimatePresence>
                {showPropertyTypeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 max-h-60 overflow-y-auto p-2"
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          updateField('property_type', type);
                          setShowPropertyTypeDropdown(false);
                        }}
                        className={`p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${formData.property_type === type ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                      >
                        <span className="text-sm font-medium">{type}</span>
                        {formData.property_type === type && <Check size={16} />}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Pricing</label>
          <div className="bg-white rounded-3xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <IndianRupee size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Base Price</p>
                  <p className="text-xs text-gray-500">Per night</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  value={formData.price_per_night}
                  onChange={(e) => updateField('price_per_night', parseFloat(e.target.value))}
                  className="w-20 text-right text-xl font-bold text-gray-900 outline-none bg-transparent p-0"
                />
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Weekend Price</p>
                  <p className="text-xs text-gray-500">Fri & Sat nights</p>
                </div>
              </div>

              {formData.weekend_price ? (
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-xl h-9">
                  <span className="text-purple-400 font-medium text-sm">₹</span>
                  <input
                    type="number"
                    value={formData.weekend_price}
                    onChange={(e) => updateField('weekend_price', parseFloat(e.target.value))}
                    className="w-16 text-right text-lg font-bold text-purple-700 outline-none bg-transparent p-0"
                  />
                  <button
                    onClick={() => updateField('weekend_price', null)}
                    className="ml-2 w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-purple-700 hover:bg-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => updateField('weekend_price', (formData.price_per_night * 1.1).toFixed(0))}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors h-9 flex items-center"
                >
                  Add Custom Price
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Capacity & Rules */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Capacity & Rules</label>
          <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">

            {/* Guests */}
            <div className="p-5 flex items-center justify-between border-b border-gray-50">
              <span className="text-sm font-semibold text-gray-900">Max Guests</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleDecrement('guests', 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 active:scale-90 transition-all bg-white shadow-sm"
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <span className="font-bold text-xl w-8 text-center text-gray-900">{formData.guests}</span>
                <button
                  onClick={() => handleIncrement('guests', 20)}
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 active:scale-90 transition-all bg-white shadow-sm"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Check-in / Check-out */}
            <div className="grid grid-cols-2 divide-x divide-gray-50 border-b border-gray-50">
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={14} />
                  <span className="text-xs font-medium uppercase">Check-in</span>
                </div>
                <input
                  type="time"
                  value={formData.checkIn}
                  onChange={(e) => updateField('checkIn', e.target.value)}
                  className="bg-gray-50 text-gray-900 rounded-xl px-3 py-2 text-sm font-bold outline-none border border-transparent focus:border-gray-200 focus:bg-white transition-all w-full"
                />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={14} />
                  <span className="text-xs font-medium uppercase">Check-out</span>
                </div>
                <input
                  type="time"
                  value={formData.checkOut}
                  onChange={(e) => updateField('checkOut', e.target.value)}
                  className="bg-gray-50 text-gray-900 rounded-xl px-3 py-2 text-sm font-bold outline-none border border-transparent focus:border-gray-200 focus:bg-white transition-all w-full"
                />
              </div>
            </div>

            {/* Auto-bookable */}
            <div className="p-5 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Instant Book</p>
                  <p className="text-xs text-gray-500">Guests can book without approval</p>
                </div>
              </div>
              <div
                onClick={() => updateField('auto_bookable', !formData.auto_bookable)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${formData.auto_bookable ? "bg-green-500" : "bg-gray-200"}`}
              >
                <motion.div
                  animate={{ x: formData.auto_bookable ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-5 h-5 bg-white rounded-full shadow-sm"
                />
              </div>
            </div>

            {/* Pets Allowed */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <Star size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pets Allowed</p>
                  <p className="text-xs text-gray-500">Are pets welcome?</p>
                </div>
              </div>
              <div
                onClick={() => updateField('pets_allowed', !formData.pets_allowed)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${formData.pets_allowed ? "bg-green-500" : "bg-gray-200"}`}
              >
                <motion.div
                  animate={{ x: formData.pets_allowed ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-5 h-5 bg-white rounded-full shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Amenities - Comprehensive */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amenities</label>
            <button
              onClick={() => setShowAmenitiesModal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Edit All
            </button>
          </div>

          {/* Preview of selected amenities */}
          <div className="flex flex-wrap gap-2">
            {formData.included_amenities.length > 0 ? (
              formData.included_amenities.slice(0, 6).map((amenity: string) => (
                <div key={amenity} className="px-3 py-1.5 h-8 bg-gray-900 text-white rounded-full text-xs font-medium flex items-center gap-1">
                  <Check size={10} /> {amenity}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">No amenities selected</p>
            )}
            {formData.included_amenities.length > 6 && (
              <button
                onClick={() => setShowAmenitiesModal(true)}
                className="px-3 py-1.5 h-8 bg-gray-100 text-gray-600 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors"
              >
                +{formData.included_amenities.length - 6} more
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAmenitiesModal(true)}
            className="w-full py-3 rounded-2xl border border-dashed border-gray-300 text-gray-500 font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Amenities
          </button>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Description</label>
          <div className="bg-white rounded-3xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
            <AutoResizeTextarea
              value={formData.the_space || formData.description}
              onChange={(e: any) => updateField('description', e.target.value)}
              className="w-full p-5 text-sm leading-relaxed text-gray-700 resize-none outline-none bg-transparent rounded-3xl"
              placeholder="Tell guests what makes your place unique..."
              minHeight="160px"
            />
          </div>
        </div>

        {/* Additional Details - Separated */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Additional Details</label>
          <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden divide-y divide-gray-50">

            <div className="p-5">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold text-sm">
                <FileText size={16} className="text-gray-400" />
                Additional Rules
              </div>
              <AutoResizeTextarea
                value={formData.additional_rules}
                onChange={(e: any) => updateField('additional_rules', e.target.value)}
                className="w-full text-sm text-gray-600 resize-none outline-none bg-transparent placeholder-gray-300"
                placeholder="E.g. No smoking, No parties..."
                minHeight="80px"
              />
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold text-sm">
                <Info size={16} className="text-gray-400" />
                Guest Access
              </div>
              <AutoResizeTextarea
                value={formData.guest_access}
                onChange={(e: any) => updateField('guest_access', e.target.value)}
                className="w-full text-sm text-gray-600 resize-none outline-none bg-transparent placeholder-gray-300"
                placeholder="Which parts of the property can guests access?"
                minHeight="80px"
              />
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold text-sm">
                <Map size={16} className="text-gray-400" />
                Getting Around
              </div>
              <AutoResizeTextarea
                value={formData.getting_around}
                onChange={(e: any) => updateField('getting_around', e.target.value)}
                className="w-full text-sm text-gray-600 resize-none outline-none bg-transparent placeholder-gray-300"
                placeholder="Public transport, parking, etc."
                minHeight="80px"
              />
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold text-sm">
                <MapPin size={16} className="text-gray-400" />
                Neighborhood
              </div>
              <AutoResizeTextarea
                value={formData.neighborhood_description}
                onChange={(e: any) => updateField('neighborhood_description', e.target.value)}
                className="w-full text-sm text-gray-600 resize-none outline-none bg-transparent placeholder-gray-300"
                placeholder="What's the neighborhood like?"
                minHeight="80px"
              />
            </div>

          </div>
        </div>

      </div>

      {/* --- Amenities Modal --- */}
      <AnimatePresence>
        {showAmenitiesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg h-[90dvh] sm:h-[80dvh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold text-gray-900">Amenities</h3>
                <button
                  onClick={() => setShowAmenitiesModal(false)}
                  className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search amenities..."
                    value={amenitySearch}
                    onChange={(e) => setAmenitySearch(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-8">
                {Object.entries(filteredAmenities).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900">{category}</h4>
                    <div className="space-y-2">
                      {items.map((amenity) => {
                        const isSelected = (formData.included_amenities || []).includes(amenity);
                        return (
                          <div
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className="flex items-center justify-between py-2 cursor-pointer group"
                          >
                            <span className={`text-base ${isSelected ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                              {amenity}
                            </span>
                            <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-gray-300 bg-white group-hover:border-gray-400"
                              }`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-px bg-gray-100" />
                  </div>
                ))}

                {Object.keys(filteredAmenities).length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No amenities found matching "{amenitySearch}"
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-white safe-bottom">
                <button
                  onClick={() => setShowAmenitiesModal(false)}
                  className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
                >
                  Save Amenities
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
