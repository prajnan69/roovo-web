"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Clock,
  DollarSign,
  Home,
  ChevronDown,
  ChevronUp,
  Zap,
  Star,
  Search,
  Plus
} from "lucide-react";
import { fetchAmenities } from "@/services/api";

// --- Helper Functions ---

const decodeHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

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

const AMENITIES_CATEGORIES: Record<string, string[]> = {};

// Flattened list for search
// Flattened list for search - moved inside component or derived from state
// const ALL_AMENITIES = Object.values(AMENITIES_CATEGORIES).flat();

import { Calendar as CalendarIcon, RefreshCw, Copy, Globe } from "lucide-react";
import { API_BASE_URL, syncIcal } from "@/services/api";

// --- Helper Component: ContentEditable for Description ---
const ContentEditable = ({ value, onChange, className, placeholder }: any) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentEditableRef.current && value !== contentEditableRef.current.innerHTML) {
      // Only update if the content is different to avoid cursor jumping
      contentEditableRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = (e: any) => {
    onChange(e.currentTarget.innerHTML);
  };

  return (
    <div
      ref={contentEditableRef}
      contentEditable
      onInput={handleInput}
      className={className}
      suppressContentEditableWarning={true}
      data-placeholder={placeholder}
      style={{ minHeight: "160px", outline: "none" }}
    />
  );
};

export default function EditListingView({ listing, onClose, onSave }: { listing: any; onClose: () => void; onSave: (data: any) => void }) {
  const [amenitiesCategories, setAmenitiesCategories] = useState<Record<string, string[]>>(AMENITIES_CATEGORIES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(true);

  useEffect(() => {
    const loadAmenities = async () => {
      setIsLoadingAmenities(true);
      try {
        const data = await fetchAmenities();
        if (data && Object.keys(data).length > 0) {
          setAmenitiesCategories(data);
        }
      } catch (err) {
        console.error("Failed to load amenities", err);
      } finally {
        setIsLoadingAmenities(false);
      }
    };
    loadAmenities();
  }, []);

  // Helper to extract amenities from structured data
  const getFlatAmenities = (amenitiesData: any) => {
    if (Array.isArray(amenitiesData)) {
      // Handle the flat structure with { title, available, groupName }
      if (amenitiesData.length > 0 && typeof amenitiesData[0] === 'object' && 'title' in amenitiesData[0]) {
        return amenitiesData
          .filter((item: any) => item.available)
          .map((item: any) => item.title);
      }

      // Handle the Nested structure { category, items }
      return amenitiesData.reduce((acc: string[], curr: any) => [...acc, ...(curr.items || [])], []);
    }
    return [];
  };

  // Local state for form handling
  const [formData, setFormData] = useState({
    ...listing,
    // Map existing columns to form fields
    guests: listing.max_guests || 1,
    checkIn: listing.operations_data?.checkInTime || "14:00",
    checkOut: listing.operations_data?.checkOutTime || "11:00",
    weekend_price: (listing.base_price_weekend !== undefined && listing.base_price_weekend !== null) ? String(listing.base_price_weekend) : "",
    price_per_night: (listing.base_price_weekday !== undefined && listing.base_price_weekday !== null) ? String(listing.base_price_weekday) : "",
    included_amenities: getFlatAmenities(listing.amenities_data),
    additional_rules: (listing.house_rules || []).find((r: any) => typeof r === 'string') || "",
    guest_access: listing.operations_data?.guest_access || "",
    getting_around: listing.operations_data?.getting_around || "",
    neighborhood_description: listing.neighborhood_desc || "",
    auto_bookable: listing.is_auto_bookable || false,
    pets_allowed: listing.pets_allowed || false,
    description: decodeHtml(listing.description || ""),
    title: listing.title || "",
    property_type: listing.property_type || "Apartment",
    ical_import_url: listing.ical_import_url || ""
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState("");

  const handleSync = async () => {
    if (!listing.id) return;
    setIsSyncing(true);
    setSyncStatus("Syncing...");
    try {
      await syncIcal(listing.id, formData.ical_import_url);
      setSyncStatus("Success!");
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err: any) {
      setSyncStatus("Failed");
      console.error(err);
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyExportUrl = () => {
    let url = `${API_BASE_URL}/api/ical/export/${listing.id}`;
    // Ensure production domain is used if the current setup is pointing to localhost
    url = url.replace('localhost:3002', 'roovo.in').replace('127.0.0.1:3002', 'roovo.in').replace('localhost', 'roovo.in');
    navigator.clipboard.writeText(url);
    alert("Export URL copied to clipboard!");
  };

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

  const handleSave = () => {
    // Construct the payload matching listings_new schema
    const payload = {
      id: listing.id, // Preserve ID
      max_guests: formData.guests,
      base_price_weekday: Number(formData.price_per_night) || 0,
      base_price_weekend: (formData.weekend_price !== null && formData.weekend_price !== undefined && formData.weekend_price !== '') ? Number(formData.weekend_price) : (Number(formData.price_per_night) || 0),
      is_auto_bookable: formData.auto_bookable,
      pets_allowed: formData.pets_allowed,
      neighborhood_desc: formData.neighborhood_description,
      title: formData.title,
      description: formData.description,
      property_type: formData.property_type,
      ical_import_url: formData.ical_import_url,

      // Operations Data
      operations_data: {
        ...(listing.operations_data || {}),
        checkInTime: formData.checkIn,
        checkOutTime: formData.checkOut,
        guest_access: formData.guest_access,
        getting_around: formData.getting_around,
      },

      // House Rules: Ensure array of strings
      house_rules: [
        ...(formData.additional_rules ? [formData.additional_rules] : [])
      ],

      // Amenities: Flatten to [{ title, groupName, available }] format
      amenities_data: Object.entries(amenitiesCategories).flatMap(([groupName, items]) =>
        items.map(title => ({
          title,
          groupName,
          available: formData.included_amenities.includes(title),
          subTitle: ""
        }))
      )
    };

    onSave(payload);
  };

  // Filter amenities based on search
  const filteredAmenities = useMemo(() => {
    if (!amenitySearch) return amenitiesCategories;
    const filtered: Record<string, string[]> = {};
    Object.entries(amenitiesCategories).forEach(([category, items]) => {
      const matchingItems = items.filter(item =>
        item.toLowerCase().includes(amenitySearch.toLowerCase())
      );
      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });
    return filtered;
  }, [amenitySearch, amenitiesCategories]);

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
          onClick={handleSave}
          disabled={!hasChanges}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${hasChanges
            ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 shadow-indigo-200"
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
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
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
                        className={`p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${formData.property_type === type ? "bg-indigo-50 text-indigo-600" : "text-gray-700"}`}
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
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Base Price Management</label>
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">

            <div className="p-5 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <DollarSign size={20} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Weekday Price</label>
                  <div className="flex items-baseline">
                    <span className="text-lg font-bold text-gray-900 mr-1">₹</span>
                    <input
                      type="number"
                      value={formData.price_per_night}
                      onChange={(e) => updateField('price_per_night', e.target.value)}
                      className="w-full text-xl font-bold text-gray-900 outline-none bg-transparent placeholder-gray-200"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Star size={20} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Weekend Price (Fri/Sat)</label>
                  <div className="flex items-baseline">
                    <span className="text-lg font-bold text-gray-900 mr-1">₹</span>
                    <input
                      type="number"
                      value={formData.weekend_price}
                      onChange={(e) => updateField('weekend_price', e.target.value)}
                      className="w-full text-xl font-bold text-gray-900 outline-none bg-transparent placeholder-gray-200"
                      placeholder={formData.price_per_night ? String(formData.price_per_night) : "Same as weekday"}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                window.history.pushState({}, '', `/hosting/calendar?listingId=${listing.id}`);
                const navEvent = new PopStateEvent('popstate');
                window.dispatchEvent(navEvent);
              }}
              className="w-full py-4 text-sm font-bold text-indigo-600 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <CalendarIcon size={16} />
              Open Smart Pricing Calendar
            </button>
          </div>
        </div>

        {/* Calendar Sync Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Calendar Synchronization</label>
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 space-y-6">
            {/* Import Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon size={16} className="text-indigo-600" />
                <span className="text-sm font-bold text-gray-900">Import Airbnb Calendar</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Paste your Airbnb iCal link to sync availability to Roovo.</p>
              <div className="relative">
                <input
                  type="text"
                  value={formData.ical_import_url}
                  onChange={(e) => updateField('ical_import_url', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all font-mono"
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                />
              </div>
              {formData.ical_import_url && listing.id && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                  {syncStatus || "Sync Now"}
                </button>
              )}
            </div>

            <div className="h-px bg-gray-100" />

            {/* Export Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={16} className="text-indigo-600" />
                <span className="text-sm font-bold text-gray-900">Export to Airbnb</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Use this link in Airbnb's "Import Calendar" settings to sync Roovo bookings back.</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {`${API_BASE_URL}/api/ical/export/${listing.id}`.replace('localhost:3002', 'roovo.in').replace('127.0.0.1:3002', 'roovo.in').replace('localhost', 'roovo.in')}
                </div>
                <button
                  onClick={copyExportUrl}
                  className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl active:scale-90 transition-all"
                  title="Copy Link"
                >
                  <Copy size={18} />
                </button>
              </div>
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
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white text-black hover:bg-gray-100 hover:border-gray-300 active:scale-90 transition-all shadow-sm"
                >
                  <span className="text-lg font-bold leading-none pb-0.5">&#10094;</span>
                </button>
                <span className="font-bold text-xl w-8 text-center text-gray-900">{formData.guests}</span>
                <button
                  onClick={() => handleIncrement('guests', 20)}
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white text-black hover:bg-gray-100 hover:border-gray-300 active:scale-90 transition-all shadow-sm"
                >
                  <span className="text-lg font-bold leading-none pb-0.5">&#10095;</span>
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
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Instant Book</p>
                  <p className="text-xs text-gray-500">Guests can book without approval</p>
                </div>
              </div>
              <div
                onClick={() => updateField('auto_bookable', !formData.auto_bookable)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${formData.auto_bookable ? "bg-indigo-600" : "bg-gray-200"}`}
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
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Star size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pets Allowed</p>
                  <p className="text-xs text-gray-500">Are pets welcome?</p>
                </div>
              </div>
              <div
                onClick={() => updateField('pets_allowed', !formData.pets_allowed)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${formData.pets_allowed ? "bg-indigo-600" : "bg-gray-200"}`}
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
            <ContentEditable
              value={formData.description}
              onChange={(html: string) => updateField('description', html)}
              className="w-full p-5 text-sm leading-relaxed text-gray-700 resize-none outline-none bg-transparent rounded-3xl [&_b]:font-bold [&_strong]:font-bold"
              placeholder="Tell guests what makes your place unique..."
            />
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
                {isLoadingAmenities ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading amenities...</p>
                  </div>
                ) : (
                  Object.entries(filteredAmenities).map(([category, items]) => (
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
                  ))
                )}

                {!isLoadingAmenities && Object.keys(filteredAmenities).length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No amenities found matching "{amenitySearch}"
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-white safe-bottom">
                <button
                  onClick={() => setShowAmenitiesModal(false)}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform shadow-lg shadow-indigo-200"
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
