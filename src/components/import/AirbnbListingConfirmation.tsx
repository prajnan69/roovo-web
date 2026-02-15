import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Users, BedDouble, Bath, Check, X, ChevronDown, ChevronUp, Home, Sparkles, ArrowRight, Lock, User } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import Toast from "../ui/toast";
import { Drawer } from "vaul";

interface AirbnbListingData {
    id: string;
    title: string;
    description: string;
    starRating: number;
    reviewsCount: number;
    maxGuestCapacity: number;
    pricing: {
        price: string;
        currency: string;
        rateType: string;
    };
    location: {
        address: string;
        latitude: number;
        longitude: number;
    };
    photos: Array<{
        url: string;
        caption: string;
    }>;
    amenities: Array<{
        category: string;
        items: string[];
    }>;
    hostDetails: {
        id: string;
        name: string;
        isSuperhost: boolean;
    };
    houseRules: string[];
    ratings: {
        accuracy: number;
        checkin: number;
        cleanliness: number;
        communication: number;
        location: number;
        value: number;
    };
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    propertyType?: string;
    enableRoomSplitting?: boolean;
}

interface AirbnbListingConfirmationProps {
    data: AirbnbListingData;
    onConfirm: (data: Partial<AirbnbListingData>) => void;
    onCancel: () => void;
    confirmLabel?: string;
    enableRoomSplitting?: boolean;
}

// Helper for smooth text transitions
function AnimatedText({ text, className, step }: { text: string; className?: string; step: number }) {
    return (
        <AnimatePresence mode="wait">
            <motion.span
                key={text}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`text-xs font-bold mt-1 ${className}`}
            >
                {text}
            </motion.span>
        </AnimatePresence>
    );
}

export default function AirbnbListingConfirmation({ data, onConfirm, onCancel, confirmLabel, enableRoomSplitting: initialRoomSplit = false }: AirbnbListingConfirmationProps) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
    const preloadingRef = useRef(false);

    // Editable Stats State
    const [guests, setGuests] = useState(data.maxGuestCapacity || 1);
    const [bedrooms, setBedrooms] = useState(data.bedrooms || 1);
    const [beds, setBeds] = useState(data.beds || 1);
    const [bathrooms, setBathrooms] = useState(data.bathrooms || 1);
    const [propertyType, setPropertyType] = useState(data.propertyType || "Entire house");

    // Room Splitting State
    const [enableRoomSplitting, setEnableRoomSplitting] = useState(initialRoomSplit);
    const [isRoomSplitDrawerOpen, setIsRoomSplitDrawerOpen] = useState(false);
    const [hasDeclinedSmartInventory, setHasDeclinedSmartInventory] = useState(false);

    // Animation Stage State
    const [animationStep, setAnimationStep] = useState(0);

    useEffect(() => {
        if (!isRoomSplitDrawerOpen) return;
        const timer = setInterval(() => {
            setAnimationStep((prev) => (prev + 1) % 6);
        }, 2000);
        return () => clearInterval(timer);
    }, [isRoomSplitDrawerOpen]);

    const proceedToConfirm = (finalRoomSplitState: boolean) => {
        setToastMessage("Listing imported successfully! 🎉");
        triggerHaptic();

        setTimeout(() => {
            onConfirm({
                maxGuestCapacity: guests,
                bedrooms,
                beds,
                bathrooms,
                propertyType,
                enableRoomSplitting: finalRoomSplitState
            });
        }, 1500);
    };

    const handleConfirm = async () => {
        await triggerHaptic();

        // Smart Inventory Upsell Logic
        // If eligible (Entire House > 1 Bedroom) AND NOT enabled AND NOT explicitly declined
        if (propertyType === "Entire house" && bedrooms > 1 && !enableRoomSplitting && !hasDeclinedSmartInventory) {
            setIsRoomSplitDrawerOpen(true);
            return;
        }

        proceedToConfirm(enableRoomSplitting);
    };

    // Preload images in batches of 5
    const preloadImages = (startIndex: number, count: number = 5) => {
        if (preloadingRef.current) return;
        preloadingRef.current = true;

        const imagesToPreload: number[] = [];
        for (let i = 0; i < count; i++) {
            const index = (startIndex + i) % data.photos.length;
            if (!preloadedImages.has(index)) {
                imagesToPreload.push(index);
            }
        }

        imagesToPreload.forEach(index => {
            const img = new Image();
            img.src = data.photos[index].url;
            img.onload = () => {
                setPreloadedImages(prev => new Set([...prev, index]));
            };
        });

        preloadingRef.current = false;
    };

    // Preload initial 5 images on mount
    useEffect(() => {
        preloadImages(0, 5);
    }, []);

    // Handle slide navigation
    const handleSlideChange = (index: number) => {
        setActiveSlide(index);
        triggerHaptic();

        // Preload next batch if we are near the end of current batch
        // Logic: if index % 5 === 4 (last item in batch), preload next 5
        if (index % 5 === 4 && index + 1 < data.photos.length) {
            preloadImages(index + 1, 5);
        }
    };



    const handleCancel = async () => {
        await triggerHaptic();
        onCancel();
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-safe-bottom">
            {/* Header */}
            <div className="pt-[calc(env(safe-area-inset-top)+1rem)] px-5 pb-4 bg-white sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleCancel}
                        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                        <span className="text-md font-bold border-1 ml-4 rounded-2xl py-1 px-3 text-indigo-500">Back</span>
                    </button>
                    <div className="text-sm font-bold text-gray-400">STEP 1 OF 5</div>
                </div>
                <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">Confirm Details</h2>
                    <p className="text-gray-500 text-sm mt-1">Review the imported information</p>
                </div>
            </div>

            <div className="px-5 py-6 space-y-6 max-w-2xl mx-auto">
                {/* Image Carousel */}
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg shadow-gray-900/10">
                    <AnimatePresence initial={false} mode="wait">
                        <motion.img
                            key={activeSlide}
                            src={data.photos[activeSlide]?.url}
                            alt={data.photos[activeSlide]?.caption || "Listing photo"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, { offset }) => {
                                const swipe = offset.x;

                                if (swipe < -50) {
                                    // Swipe Left (Next)
                                    if (activeSlide < data.photos.length - 1) {
                                        handleSlideChange(activeSlide + 1);
                                    } else {
                                        // Loop back to start? Or just stop? 
                                        // Requirement says "next 5 images will come and the marker will go to 1st image"
                                        // This implies pagination logic is handled in handleSlideChange
                                    }
                                } else if (swipe > 50) {
                                    // Swipe Right (Previous)
                                    if (activeSlide > 0) {
                                        handleSlideChange(activeSlide - 1);
                                    }
                                }
                            }}
                            className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
                        />
                    </AnimatePresence>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {/* Navigation Dots - Sliding window without arrows */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                        <div className="flex gap-1.5">
                            {(() => {
                                // Calculate window start based on active slide
                                // We want sets of 5: 0-4, 5-9, 10-14...
                                // If activeSlide is 0-4, windowStart is 0
                                // If activeSlide is 5-9, windowStart is 5
                                const currentWindowStart = Math.floor(activeSlide / 5) * 5;

                                // Ensure we don't go out of bounds (though the math above handles it well for the start)
                                // We show up to 5 dots starting from currentWindowStart
                                const maxDots = 5;
                                const remainingPhotos = data.photos.length - currentWindowStart;
                                const dotsToShow = Math.min(maxDots, remainingPhotos);

                                const visibleIndices = Array.from({ length: dotsToShow }, (_, i) => currentWindowStart + i);

                                return visibleIndices.map((photoIndex) => (
                                    <motion.button
                                        key={photoIndex}
                                        onClick={() => handleSlideChange(photoIndex)}
                                        className={`h-2 rounded-full transition-all ${photoIndex === activeSlide ? "bg-white w-4" : "bg-white/50 w-2"
                                            }`}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* Title & Rating */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div className="flex justify-between items-start gap-4 mb-6">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {data.title}
                        </h3>
                        {data.reviewsCount > 0 && data.ratings && Object.keys(data.ratings).length > 0 && (
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg shrink-0">
                                <Star size={14} className="text-orange-500 fill-orange-500" />
                                <span className="text-sm font-bold text-gray-900">{data.starRating}</span>
                            </div>
                        )}
                    </div>

                    {/* Property Type Dropdown */}
                    <div className="mb-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                            <Home className="w-4 h-4 text-indigo-500" />
                            Property Type
                        </label>
                        <div className="relative">
                            <select
                                value={propertyType}
                                onChange={(e) => {
                                    setPropertyType(e.target.value);
                                    triggerHaptic();
                                }}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            >
                                <option value="Entire house">Entire house</option>
                                <option value="Room in house">Room in house</option>
                                <option value="Shared room">Shared room</option>
                                <option value="Hotel">Hotel</option>
                                <option value="Farm stay">Farm stay</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Room Splitting Banner */}
                    <AnimatePresence>
                        {propertyType === "Entire house" && bedrooms > 1 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 overflow-hidden"
                            >
                                <div
                                    onClick={() => setIsRoomSplitDrawerOpen(true)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${enableRoomSplitting ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-indigo-200'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${enableRoomSplitting ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 shadow-sm'}`}>
                                            <Sparkles size={16} fill={enableRoomSplitting ? "currentColor" : "none"} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-900">Maximize Your Earnings</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                {enableRoomSplitting
                                                    ? "Smart Inventory Active! We'll list rooms separately when the house isn't full."
                                                    : "Convert this listing into multiple units (House + Rooms) to get more bookings."}
                                            </p>
                                        </div>
                                        {enableRoomSplitting && <Check size={18} className="text-indigo-600 shrink-0 mt-1" />}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats Grid - Editable */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Guests */}
                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                                <Users className="w-4 h-4 text-indigo-500" />
                                Guests
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
                                <button
                                    onClick={() => {
                                        if (guests > 1) {
                                            setGuests(g => g - 1);
                                            triggerHaptic();
                                        }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-sm font-bold text-gray-900 w-4 text-center">{guests}</span>
                                <button
                                    onClick={() => {
                                        setGuests(g => g + 1);
                                        triggerHaptic();
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Bedrooms */}
                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                                <BedDouble className="w-4 h-4 text-indigo-500" />
                                Bedrooms
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
                                <button
                                    onClick={() => {
                                        if (bedrooms > 0) {
                                            setBedrooms(b => b - 1);
                                            triggerHaptic();
                                        }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-sm font-bold text-gray-900 w-4 text-center">{bedrooms}</span>
                                <button
                                    onClick={() => {
                                        setBedrooms(b => b + 1);
                                        triggerHaptic();
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Beds */}
                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                                <BedDouble className="w-4 h-4 text-indigo-500" />
                                Beds
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
                                <button
                                    onClick={() => {
                                        if (beds > 0) {
                                            setBeds(b => b - 1);
                                            triggerHaptic();
                                        }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-sm font-bold text-gray-900 w-4 text-center">{beds}</span>
                                <button
                                    onClick={() => {
                                        setBeds(b => b + 1);
                                        triggerHaptic();
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Bathrooms */}
                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                                <Bath className="w-4 h-4 text-indigo-500" />
                                Baths
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
                                <button
                                    onClick={() => {
                                        if (bathrooms > 0.5) {
                                            setBathrooms(b => b - 0.5);
                                            triggerHaptic();
                                        }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-sm font-bold text-gray-900 w-8 text-center">{bathrooms}</span>
                                <button
                                    onClick={() => {
                                        setBathrooms(b => b + 0.5);
                                        triggerHaptic();
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-bold text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">About this place</h4>
                    <motion.div
                        initial={false}
                        animate={{ height: "auto" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={showFullDescription ? "full" : "preview"}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${!showFullDescription && 'line-clamp-3'}`}
                                dangerouslySetInnerHTML={{
                                    __html: data.description.replace(/<br\/>/g, '\n').replace(/<br>/g, '\n')
                                }}
                            />
                        </AnimatePresence>
                    </motion.div>
                    <motion.button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-indigo-600 text-sm font-semibold mt-2 flex items-center gap-1 hover:text-indigo-700"
                        whileTap={{ scale: 0.98 }}
                    >
                        {showFullDescription ? (
                            <>Show Less <ChevronUp size={16} /></>
                        ) : (
                            <>Read More <ChevronDown size={16} /></>
                        )}
                    </motion.button>
                </div>

                {/* Amenities */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Amenities</h4>
                    <motion.div
                        className="space-y-4"
                        initial={false}
                        animate={{ height: "auto" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="space-y-4">
                            {(data.amenities || []).slice(0, showAllAmenities ? undefined : 3).map((category, idx) => (
                                <div key={idx} className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h5 className="text-xs font-bold text-gray-400 mb-2">{category.category}</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {(category.items || []).map((item, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg border border-gray-100"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                    {data.amenities.length > 3 && (
                        <motion.button
                            onClick={() => setShowAllAmenities(!showAllAmenities)}
                            className="w-full mt-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                            whileTap={{ scale: 0.98 }}
                        >
                            {showAllAmenities ? (
                                <>Show Less <ChevronUp size={16} /></>
                            ) : (
                                <>Show All {data.amenities.length} Categories <ChevronDown size={16} /></>
                            )}
                        </motion.button>
                    )}
                </div>

                {/* House Rules */}
                {data.houseRules && data.houseRules.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">House Rules</h4>
                        <div className="space-y-2">
                            {data.houseRules.map((rule, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <Check size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <span className="text-sm text-gray-600">{rule}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={onCancel}
                        className="py-4 rounded-2xl font-bold text-gray-700 bg-white border border-gray-200 shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <X size={20} />
                        Cancel
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirm}
                        className="py-4 rounded-2xl font-bold text-white bg-indigo-600 shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                        <Check size={20} />
                        {confirmLabel || "Confirm & Continue"}
                    </motion.button>
                </div>
            </div>

            {/* Room Splitting Drawer */}
            <Drawer.Root open={isRoomSplitDrawerOpen} onOpenChange={setIsRoomSplitDrawerOpen}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl z-50 focus:outline-none">
                        <div className="p-4 bg-white rounded-t-3xl pb-8">
                            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-6" />

                            <div className="max-w-md mx-auto">
                                {/* --- ANIMATION STAGE --- */}
                                <div className="h-64 bg-gradient-to-b from-slate-50 to-white rounded-2xl mb-6 relative border border-slate-100 flex items-center justify-center px-4">

                                    {/* Parent House Card */}
                                    <motion.div
                                        className="absolute top-8 w-32 h-24 bg-white border shadow-lg rounded-xl flex flex-col items-center justify-center z-10 overflow-hidden"
                                        animate={{
                                            borderColor: animationStep >= 5 ? "#e2e8f0" : (animationStep >= 3 ? "#818cf8" : "#e0e7ff"),
                                            opacity: animationStep >= 5 ? 0.6 : 1,
                                            scale: animationStep === 0 ? 1.2 : 1,
                                            y: animationStep === 0 ? 30 : 0
                                        }}
                                    >
                                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-indigo-600" />

                                        <Home size={28} className={animationStep >= 5 ? "text-slate-300" : "text-indigo-600"} />

                                        <AnimatedText
                                            step={animationStep}
                                            text={
                                                animationStep >= 5 ? "Blocked" :
                                                    (animationStep >= 3 ? "2BHK House" : "3BHK House")
                                            }
                                            className={animationStep >= 5 ? "text-slate-400" : "text-indigo-900"}
                                        />

                                        {/* Price Tag Update */}
                                        <motion.div
                                            key={animationStep >= 3 ? "low" : "high"}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-[10px] font-medium text-slate-500 mt-1"
                                        >
                                            {animationStep >= 5 ? "" : (animationStep >= 3 ? "₹8,000" : "₹12,000")}
                                        </motion.div>

                                        {/* Blocked Overlay */}
                                        {animationStep >= 5 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-[1px]"
                                            >
                                                <Lock size={20} className="text-slate-400" />
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    {/* Connecting Lines */}
                                    <div className="absolute top-32 flex justify-center gap-8 w-full">
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                className="w-[1px] h-8 bg-indigo-100"
                                                initial={{ height: 0 }}
                                                animate={{ height: animationStep >= 1 ? 24 : 0 }}
                                            />
                                        ))}
                                    </div>

                                    {/* Room Cards */}
                                    <div className="absolute bottom-6 flex justify-between w-full px-4 gap-2">
                                        {[1, 2, 3].map((roomNum, idx) => {
                                            // Logic: Room 1 booked at step 2. Room 2 booked at step 4.
                                            const isBooked = (animationStep >= 2 && idx === 0) || (animationStep >= 4 && idx === 1);

                                            return (
                                                <motion.div
                                                    key={roomNum}
                                                    className={`flex-1 h-20 rounded-xl border shadow-sm flex flex-col items-center justify-center relative
                                                        ${isBooked
                                                            ? "bg-emerald-50 border-emerald-200"
                                                            : "bg-white border-slate-200"
                                                        }
                                                    `}
                                                    initial={{ opacity: 0, y: -20 }}
                                                    animate={{
                                                        opacity: animationStep >= 1 ? 1 : 0,
                                                        y: animationStep >= 1 ? 0 : -20,
                                                        scale: isBooked ? 1.05 : 1
                                                    }}
                                                >
                                                    <BedDouble size={16} className={isBooked ? "text-emerald-600" : "text-slate-400"} />
                                                    <span className="text-[9px] font-medium text-slate-500 mt-1">Room {roomNum}</span>

                                                    {/* Booking Avatar */}
                                                    <AnimatePresence>
                                                        {isBooked && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center z-20"
                                                            >
                                                                <User size={12} className="text-white" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Narrative Text */}
                                    <div className="absolute top-3 w-full text-center px-4">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={animationStep}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 h-4"
                                            >
                                                {animationStep === 0 && "Your 3BHK House"}
                                                {animationStep === 1 && "Smartly converted to listings"}
                                                {animationStep === 2 && "Room 1 Gets Booked"}
                                                {animationStep === 3 && "House automatically becomes 2BHK"}
                                                {animationStep === 4 && "Room 2 Gets Booked"}
                                                {animationStep === 5 && "House Blocked • Room 3 Open"}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                </div>

                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Dynamic Inventory
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        If a room is booked, we simply <strong>downsize</strong> your main listing (e.g., 3BHK → 2BHK) instead of blocking it, maximizing your chance to get bookings.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setHasDeclinedSmartInventory(true);
                                            setIsRoomSplitDrawerOpen(false);
                                            proceedToConfirm(false);
                                        }}
                                        className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-2xl transition-colors"
                                    >
                                        No Thanks
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEnableRoomSplitting(true);
                                            setIsRoomSplitDrawerOpen(false);
                                            proceedToConfirm(true);
                                        }}
                                        className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                    >
                                        Enable
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <Toast
                message={toastMessage || ""}
                isVisible={!!toastMessage}
                onClose={() => setToastMessage(null)}
            />
        </div>
    );
}
