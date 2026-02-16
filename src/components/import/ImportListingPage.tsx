import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link as LinkIcon, AlertCircle, CheckCircle2, Sparkles, X, Home, BedDouble, ArrowRight, User, Lock } from "lucide-react";
import { useNavigation } from "../../hooks/useNavigation";
import axios from "axios";
import AirbnbListingConfirmation from "./AirbnbListingConfirmation";
import PricingWizard from "./PricingWizard";
import OperationsSetup from "./OperationsSetup";
import ExtrasSetup from "./ExtrasSetup";
import VerificationStep from "./VerificationStep";
import HostProfileConfirmation from "./HostProfileConfirmation";
import CohostInvitationsModal from "./CohostInvitationsModal";
import { supabase } from "../../services/api";
import Toast from "../ui/toast";
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";
import InfinityCheckLoader from "../InfinityCheckLoader";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

import PhotoSortingStep from "./PhotoSortingStep";

export type Step = 'url' | 'confirmation' | 'pricing' | 'photo_sorting' | 'operations' | 'extras' | 'verification';

interface ImportListingPageProps {
    onClose?: () => void;
    onSuccess?: (listingId: string) => void;
    draftId?: string;
    isAuthenticated?: boolean;
    onLoginClick?: () => void;
}



// Premium Narrative Animation Component
function ImportGuidanceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [animationStep, setAnimationStep] = useState(0);

    // Animation Loop: 0->5
    // 0: 3BHK House
    // 1: Split to Rooms
    // 2: Room 1 Booked
    // 3: House becomes 2BHK
    // 4: Room 2 Booked
    // 5: House Blocked (Too small / policy)
    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => {
            setAnimationStep((prev) => (prev + 1) % 6);
        }, 2000);
        return () => clearInterval(timer);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full z-20 transition-colors"
                >
                    <X size={18} className="text-gray-500" />
                </button>

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
                                {animationStep === 1 && "Smartly converted to 4 listings"}
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

                <button
                    onClick={onClose}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all hover:shadow-indigo-300 flex items-center justify-center gap-2 group"
                >
                    <span>Import Entire House</span>
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
}

// Helper for smooth text transitions
function AnimatedText({ text, className }: { text: string; className?: string }) {
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


export default function ImportListingPage({ onClose, onSuccess, draftId: initialDraftId, isAuthenticated = false, onLoginClick }: ImportListingPageProps) {
    const { navigate, back, search } = useNavigation();
    const urlParams = new URLSearchParams(search);
    const draftIdFromUrl = urlParams.get('draftId');
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<Step>('url');

    // Data State
    const [listingData, setListingData] = useState<any>(null);
    const [pricingData, setPricingData] = useState<{ basePrice: number; weekendPrice: number; roomPrices?: number[]; enableRoomSplitting?: boolean } | null>(null);
    const [operationsData, setOperationsData] = useState<any>(null);
    const [extrasData, setExtrasData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [legalData, setLegalData] = useState<any>(null);
    const [photoAssignments, setPhotoAssignments] = useState<Record<string, string>>({});


    // Proactive check when URL changes
    useEffect(() => {
        const checkDuplicate = async () => {
            if (!url) return;
            const urlMatch = url.match(/\/rooms\/(\d+)/);
            if (!urlMatch) return;

            const roomId = urlMatch[1];

            try {
                // Check Live
                const { data: liveData } = await supabase
                    .from('listings_new')
                    .select('id')
                    .eq('airbnb_listing_id', roomId)
                    .maybeSingle();

                if (liveData) {
                    showToast("Listing already live! Redirecting...", "error");
                    setError("Listing already live on Roovo.");
                    return;
                }

                // Check Drafts
                const { data: drafts } = await supabase
                    .from('listing_scrape_draft')
                    .select('id')
                    .eq('listing_id', roomId)
                    .limit(1);

                if (drafts && drafts.length > 0) {
                    const id = drafts[0].id;
                    showToast("Already in drafts! Please continue from there...", "error");
                    setDraftId(id);
                }
            } catch (err) {
                console.error("Proactive check error:", err);
            }
        };

        const timer = setTimeout(checkDuplicate, 500); // Debounce
        return () => clearTimeout(timer);
    }, [url]);


    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [draftSaved, setDraftSaved] = useState(false);



    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        if (type === 'success') {
            triggerHaptic();
        } else {
            triggerErrorHaptic();
        }
        setTimeout(() => setToast(null), 3000);
    };

    const [draftId, setDraftId] = useState<string | null>(initialDraftId || draftIdFromUrl || null);

    // Host Profile Modal State
    const [showHostModal, setShowHostModal] = useState(false);
    const [hostData, setHostData] = useState<any>(null);

    // Co-host Invitations State
    const [invitations, setInvitations] = useState<any[]>([]);
    const [showInvitationsModal, setShowInvitationsModal] = useState(false);

    // Guidance Modal
    const [showGuidanceModal, setShowGuidanceModal] = useState(false);

    useEffect(() => {
        // Show guidance only if starting fresh
        if (!initialDraftId && step === 'url') {
            // Small delay for better UX
            setTimeout(() => setShowGuidanceModal(true), 500);
        }
    }, [initialDraftId, step]);

    const transformListingData = (data: any) => {
        // ... (rest of function)

        console.log("Transforming data:", {
            pictures: data.pictures,
            images: data.images,
            photos: data.photos,
            amenities: data.amenities,
            ratings: data.ratings,
            hostDetails: data.hostDetails,
            host: data.host
        });

        const parseJSON = (str: string | object | null) => {
            if (!str) return null;
            if (typeof str === 'object') return str;
            try {
                // If it's already an object but passed as string somehow
                if (typeof str === 'string' && (str.startsWith('{') || str.startsWith('['))) {
                    return JSON.parse(str);
                }
                return str;
            } catch (e) {
                console.error("JSON parse error", e, "for string:", str);
                return null;
            }
        };

        // Handle Amenities - Transform flat structure to grouped structure
        const amenitiesRaw = parseJSON(data.amenities) || [];
        console.log("DEBUG: Raw Amenities:", amenitiesRaw);

        let amenities: { category: string; items: string[] }[] = [];

        if (Array.isArray(amenitiesRaw)) {
            const groups = new Map<string, string[]>();

            amenitiesRaw.forEach((item: any) => {
                if (!item) return;

                // Handle cases where item is a simple string
                if (typeof item === 'string') {
                    const category = "Other";
                    if (!groups.has(category)) groups.set(category, []);
                    const currentItems = groups.get(category)!;
                    if (!currentItems.includes(item)) currentItems.push(item);
                    return;
                }

                const rawCategory = item.groupName || item.category || "Other";
                const category = typeof rawCategory === 'string' ? rawCategory.trim() : "Other";

                const itemTitle = (item.title || item.name || item.value || (typeof item === 'string' ? item : "")).trim();

                if (itemTitle) {
                    if (!groups.has(category)) {
                        groups.set(category, []);
                    }
                    // Avoid duplicates in the same category
                    const currentItems = groups.get(category)!;
                    if (!currentItems.includes(itemTitle)) {
                        currentItems.push(itemTitle);
                    }
                }
            });

            // Convert Map to Array
            amenities = Array.from(groups.entries()).map(([category, items]) => ({
                category,
                items
            }));
        }

        console.log("DEBUG: Transformed Amenities:", amenities);

        // Handle Photos - check multiple possible fields
        const picturesRaw = parseJSON(data.pictures);
        const imagesRaw = parseJSON(data.images);
        const photosRaw = parseJSON(data.photos);

        const rawPhotos = picturesRaw || imagesRaw || photosRaw || [];

        const photos = Array.isArray(rawPhotos) ? rawPhotos.map((p: any) => ({
            url: p.url,
            caption: p.caption || ""
        })) : [];

        // Handle Pricing
        const pricing = parseJSON(data.pricing) || {};

        // Handle Location
        const location = parseJSON(data.location) || {};

        // Handle Host Details - check both 'host' and 'hostDetails' fields
        const hostRaw = parseJSON(data.host) || parseJSON(data.hostDetails) || data.hostDetails || {};

        // Handle House Rules
        const rulesRaw = parseJSON(data.rules) || parseJSON(data.houseRules) || [];

        // Handle Ratings - convert from array format to object format
        const ratingsRaw = parseJSON(data.ratings) || [];
        let ratingsObj: any = {
            accuracy: 5,
            checkin: 5,
            cleanliness: 5,
            communication: 5,
            location: 5,
            value: 5
        };

        // If ratings is an array of {category, score}, convert it
        if (Array.isArray(ratingsRaw) && ratingsRaw.length > 0) {
            ratingsRaw.forEach((rating: any) => {
                const category = rating.category?.toLowerCase();
                const score = parseFloat(rating.score || "5");

                if (category === 'accuracy') ratingsObj.accuracy = score;
                else if (category === 'check-in' || category === 'checkin') ratingsObj.checkin = score;
                else if (category === 'cleanliness') ratingsObj.cleanliness = score;
                else if (category === 'communication') ratingsObj.communication = score;
                else if (category === 'location') ratingsObj.location = score;
                else if (category === 'value') ratingsObj.value = score;
            });
        }

        return {
            id: data?.listing_id || data?.id || "unknown",
            title: data?.public_name || data?.title || "Untitled Listing",
            description: data?.description || "",
            starRating: parseFloat(data?.rating || data?.starRating || "0"),
            reviewsCount: parseInt(data?.review_count || data?.reviewsCount || "0"),
            maxGuestCapacity: parseInt(data?.max_guest_capacity || data?.maxGuestCapacity || "0"),
            pricing: {
                price: pricing?.price || data?.price || "0",
                currency: pricing?.currency || "INR",
                rateType: pricing?.rateType || pricing?.rate_type || "nightly",
                discountedPrice: pricing?.discountedPrice,
                originalPrice: pricing?.originalPrice,
                breakdown: pricing?.breakdown
            },
            location: {
                address: location?.address || "",
                latitude: parseFloat(location?.latitude || "0"),
                longitude: parseFloat(location?.longitude || "0")
            },
            photos,
            amenities,
            hostDetails: {
                id: hostRaw?.id || "unknown",
                name: hostRaw?.name || "Host",
                isSuperhost: hostRaw?.isSuperhost || hostRaw?.is_superhost || false
            },
            houseRules: Array.isArray(rulesRaw) ? rulesRaw.map((r: any) => r?.title || r) : [],
            ratings: ratingsObj,
            cohosts: data?.cohosts || data?.coHosts || [],
            propertyType: data?.propertyType || data?.property_type || data?.roomType || data?.room_type || "Entire house",
            bedrooms: parseInt(data?.bedrooms || "1"),
            bathrooms: parseInt(data?.bathrooms || "1"),
            beds: parseInt(data?.beds || "1"),
            rawScrapedData: data // Keep raw data for photo sorting if needed
        };
    };

    // Load draft if provided
    useEffect(() => {
        const fetchDraft = async () => {
            if (!draftId) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/airbnb/draft/${draftId}`);
                const draft = response.data;

                if (draft) {
                    console.log("Draft loaded successfully:", draft.id);
                    setDraftId(draft.id); // Sync state with loaded draft

                    // Restore state from draft
                    if (draft.raw) {
                        try {
                            const baseData = transformListingData(draft.raw);
                            // Override with saved draft details if they exist (user might have edited them)
                            if (draft.bedrooms) baseData.bedrooms = typeof draft.bedrooms === 'string' ? parseInt(draft.bedrooms) : draft.bedrooms;
                            if (draft.bathrooms) baseData.bathrooms = typeof draft.bathrooms === 'string' ? parseInt(draft.bathrooms) : draft.bathrooms;
                            if (draft.beds) baseData.beds = typeof draft.beds === 'string' ? parseInt(draft.beds) : draft.beds;
                            if (draft.property_type) baseData.propertyType = draft.property_type;
                            if (draft.max_guest_capacity) baseData.maxGuestCapacity = typeof draft.max_guest_capacity === 'string' ? parseInt(draft.max_guest_capacity) : draft.max_guest_capacity;

                            setListingData(baseData);
                        } catch (transformErr) {
                            console.error("Error transforming draft raw data:", transformErr);
                            // Fallback or show error?
                        }
                    }

                    if (draft.pricing_data) setPricingData(draft.pricing_data);
                    if (draft.operations_data) setOperationsData(draft.operations_data);
                    if (draft.extras_data) setExtrasData(draft.extras_data);
                    if (draft.legal_data) setLegalData(draft.legal_data);
                    if (draft.photo_assignments) setPhotoAssignments(draft.photo_assignments);


                    // Set step based on current_step or infer
                    if (draft.current_step) {
                        let nextStep: Step = 'url';
                        if (draft.current_step === 'import' || draft.current_step === 'confirmation') nextStep = 'confirmation';
                        if (draft.current_step === 'pricing') nextStep = 'pricing';
                        if (draft.current_step === 'photo_sorting' || draft.current_step === 'photo_assignments') nextStep = 'photo_sorting';
                        if (draft.current_step === 'operations') nextStep = 'operations';
                        if (draft.current_step === 'import_details') nextStep = 'pricing';
                        if (draft.current_step === 'extras') nextStep = 'extras';
                        if (draft.current_step === 'verification') nextStep = 'verification';

                        setStep(nextStep);
                    } else {
                        // Infer step
                        if (draft.legal_data) setStep('verification');
                        else if (draft.extras_data) setStep('verification');
                        else if (draft.operations_data) setStep('extras');
                        else if (draft.photo_assignments) setStep('operations'); // If photo assignments exist, move to operations
                        else if (draft.pricing_data) {
                            if (draft.pricing_data.enableRoomSplitting) {
                                setStep('photo_sorting');
                            } else {
                                setStep('operations');
                            }
                        }
                        else if (draft.raw) setStep('confirmation');
                    }
                }
            } catch (err) {
                console.error("Error fetching draft:", err);
                showToast("Failed to load draft", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDraft();
    }, [draftId]);

    const saveDraftProgress = async (step: string, data: any) => {
        if (!draftId) return;
        try {
            await axios.patch(`${API_BASE_URL}/api/airbnb/draft/${draftId}`, {
                step,
                data
            });
        } catch (err) {
            console.error("Failed to save draft progress:", err);
        }
    };




    const transformHostData = (rawHost: any) => {
        let responseRate = rawHost.responseRate;
        let responseTime = rawHost.responseTime;

        if (Array.isArray(rawHost.hostDetails)) {
            const rateStr = rawHost.hostDetails.find((s: string) => s.includes('Response rate'));
            if (rateStr) responseRate = rateStr.replace('Response rate: ', '');

            const timeStr = rawHost.hostDetails.find((s: string) => s.includes('respond'));
            if (timeStr) responseTime = timeStr;
        }

        let hostingSince = rawHost.hostingSince;
        if (!hostingSince && rawHost.timeAsHost) {
            const now = new Date();
            const years = rawHost.timeAsHost.years || 0;
            const months = rawHost.timeAsHost.months || 0;
            now.setFullYear(now.getFullYear() - years);
            now.setMonth(now.getMonth() - months);
            hostingSince = now.toISOString();
        }

        return {
            name: rawHost.name,
            profilePictureUrl: rawHost.profilePictureUrl,
            isSuperhost: rawHost.isSuperhost,
            hostingSince: hostingSince,
            bio: rawHost.about ? [rawHost.about] : (rawHost.bio || []),
            reviewsCount: rawHost.ratingCount || rawHost.reviewsCount,
            averageRating: rawHost.ratingAverage || rawHost.averageRating,
            responseRate,
            responseTime,
            // Keep original raw data for backend if needed, but createHost now handles mapped data too
            ...rawHost
        };
    };

    const handleImport = async () => {
        if (!url) {
            showToast("Please enter an Airbnb URL", "error");
            return;
        }

        setIsLoading(true);
        setError(null);

        // Extract room ID from URL
        const urlMatch = url.match(/\/rooms\/(\d+)/);
        if (!urlMatch) {
            setIsLoading(false);
            showToast("Invalid Airbnb URL. Please use a valid listing URL.", "error");
            return;
        }
        const roomId = urlMatch[1];

        // Extract check-in and check-out dates if present
        const urlObj = new URL(url);
        const checkIn = urlObj.searchParams.get('check_in') || undefined;
        let checkOut = urlObj.searchParams.get('check_out') || undefined;

        // Force 1 night stay for accurate nightly pricing
        if (checkIn) {
            const d = new Date(checkIn);
            if (!isNaN(d.getTime())) {
                d.setDate(d.getDate() + 1);
                checkOut = d.toISOString().split('T')[0];
            }
        }

        // Start Pre-Check Promise (Parallel to Auth if needed, but let's do it first for clarity)
        try {
            // Check Live Listings
            const { data: liveData } = await supabase
                .from('listings_new')
                .select('id')
                .eq('airbnb_listing_id', roomId)
                .maybeSingle();

            if (liveData) {
                showToast("This listing is already live on Roovo!", "error");
                setError("This listing is already live on Roovo!");
                setIsLoading(false);
                return;
            }

            // Check Drafts
            const { data: drafts } = await supabase
                .from('listing_scrape_draft')
                .select('id')
                .eq('listing_id', roomId)
                .limit(1);

            if (drafts && drafts.length > 0) {
                const id = drafts[0].id;
                showToast("Already in drafts! Please continue from there...", "error");
                setDraftId(id);
                return;
            }
        } catch (checkErr) {
            console.error("Duplicate check error:", checkErr);
            // Continue with import if check fails (fallback to backend check)
        }

        // Start Import Promise
        // We call import-listing WITHOUT host_id initially if not logged in
        // This requires backend to support optional host_id
        const importPromise = (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const hostId = session?.user?.id;

            return axios.post(`${API_BASE_URL}/api/airbnb/import-listing`, {
                airbnb_roomid: roomId,
                host_id: hostId, // Might be undefined
                checkIn,
                checkOut
            });
        })();

        // Start Auth Promise
        const authPromise = new Promise<void>((resolve) => {
            // Check session directly first to avoid race conditions with props
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session || isAuthenticated) {
                    resolve();
                } else {
                    if (onLoginClick) onLoginClick();

                    // Wait for auth state change
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_IN' && session) {
                            subscription.unsubscribe();
                            resolve();
                        }
                    });
                }
            });
        });

        try {
            // Wait for both import and authentication
            const [importResponse] = await Promise.all([importPromise, authPromise]);

            // Now we are authenticated and have the data
            const { data: { session } = {} } = await supabase.auth.getSession();
            if (!session) throw new Error("Authentication failed");

            const responseData = importResponse.data;
            console.log("Import response:", responseData);

            // If the backend returned a draftId, use it (case where we were already logged in)
            if (responseData.draftId) {
                const rawData = responseData.data;
                const transformedData = transformListingData(rawData);
                setListingData(transformedData);
                setDraftId(responseData.draftId);

                // Check price


                // Check if host profile exists
                if (responseData.hostExists === false && responseData.hostData) {
                    setHostData(transformHostData(responseData.hostData));
                    setShowHostModal(true);
                }

                showToast("Listing imported successfully! 🎉", "success");
            } else {
                // We have data but no draft (case where we weren't logged in initially)
                // We need to save this as a draft now
                const rawData = responseData.data;
                const transformedData = transformListingData(rawData);
                setListingData(transformedData);

                // Check price


                // Call save-draft endpoint
                const saveResponse = await axios.post(`${API_BASE_URL}/api/airbnb/save-draft`, {
                    scrapedData: rawData,
                    host_id: session.user.id
                });

                if (saveResponse.data.draftId) {
                    setDraftId(saveResponse.data.draftId);

                    // Check if host profile exists
                    if (saveResponse.data.hostExists === false && saveResponse.data.hostData) {
                        setHostData(transformHostData(saveResponse.data.hostData));
                        setShowHostModal(true);
                    }

                    showToast("Listing imported & saved! 🎉", "success");
                }
            }
            setStep('confirmation'); // Move to confirmation step after import
            window.scrollTo(0, 0);

        } catch (err: any) {
            console.error("Import error:", err);

            if (err.response?.status === 409) {
                const { type, message, id } = err.response.data;
                if (type === 'draft' && id) {
                    showToast("Already in drafts! Please continue from there...", "error");
                    setDraftId(id);
                    return;
                }
                showToast(message, "error");
                setError(message);
                return;
            }

            const errorMessage = err.response?.data?.message || err.message || "Failed to import listing";
            setError(errorMessage);
            showToast(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateHost = async (name: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast("Please log in to create host profile", "error");
                return;
            }

            await axios.post(`${API_BASE_URL}/api/airbnb/create-host`, {
                userId: session.user.id,
                hostData: {
                    ...hostData,
                    name: name
                }
            });

            setShowHostModal(false);
            showToast("Host profile created! 🎉", "success");
        } catch (err: any) {
            console.error("Create host error:", err);
            showToast(err.response?.data?.message || "Failed to create host profile", "error");
        }
    };

    const handleListingConfirm = async (data: any) => {
        // Update local state
        setListingData((prev: any) => ({
            ...prev,
            ...data
        }));

        // Update backend draft details (bedrooms, bathrooms, etc.)
        if (draftId) {
            await saveDraftProgress('import_details', data);
        }

        setStep('pricing');
        window.scrollTo(0, 0);
    };

    const handlePricingNext = async (pricing: { basePrice: number; weekendPrice: number; roomPrices?: number[]; enableRoomSplitting?: boolean }) => {
        setPricingData(pricing);
        await saveDraftProgress('pricing', pricing);

        if (pricing.enableRoomSplitting) {
            setStep('photo_sorting');
        } else {
            setStep('operations');
        }
        window.scrollTo(0, 0);
    };

    const handlePhotoSortingNext = async (assignments: Record<string, string>) => {
        setPhotoAssignments(assignments);
        await saveDraftProgress('photo_assignments', assignments);
        setStep('operations');
        window.scrollTo(0, 0);
    };

    const handleOperationsNext = async (data: any) => {
        setOperationsData(data);
        await saveDraftProgress('operations', data);
        setStep('extras');
        window.scrollTo(0, 0);
    };

    const handleExtrasNext = async (data: any) => {
        setExtrasData(data);
        await saveDraftProgress('extras', data);
        setStep('verification');
        window.scrollTo(0, 0);
    };

    const handleVerificationComplete = async (data: any) => {
        setLegalData(data);
        setIsLoading(true);
        await saveDraftProgress('verification', data);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Construct final payload
            const payload = {
                hostId: session.user.id,
                listingData,
                pricingData: {
                    basePrice: pricingData?.basePrice,
                    weekendPrice: pricingData?.weekendPrice,
                    roomPrices: pricingData?.roomPrices,
                    enableRoomSplitting: pricingData?.enableRoomSplitting,
                    currency: listingData.pricing?.currency || 'INR'
                },
                operationsData,
                extrasData,
                legalData: data,
                draftId: draftId, // Include draftId so backend can delete it
                photoAssignments: pricingData?.enableRoomSplitting ? photoAssignments : undefined,
            };

            const response = await axios.post(`${API_BASE_URL}/api/airbnb/create-complete`, payload);

            if (response.data.success) {
                const hasVideo = response.data.hasVideo;
                const successMessage = hasVideo
                    ? "Listing confirmed! 🎉 Your property is now under review."
                    : "Draft saved! 📹 Add a home tour video to go live.";

                if (response.data.invitations && response.data.invitations.length > 0) {
                    setInvitations(response.data.invitations);
                    setShowInvitationsModal(true);
                    showToast(successMessage, "success");
                } else {
                    showToast(successMessage, "success");
                    // If it's just a draft save (no video), set state instead of auto-navigating
                    if (hasVideo) {
                        const delay = 2000;
                        setTimeout(() => {
                            if (onSuccess && response.data.data?.id) {
                                onSuccess(response.data.data.id);
                            } else if (onClose) {
                                onClose();
                            } else {
                                // Manually trigger navigation to ensure it works
                                window.history.pushState({}, '', '/hosting/listings');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                            }
                        }, delay);
                    } else {
                        // For draft saves, just set the state and let user click button
                        setDraftSaved(true);
                        setIsLoading(false);
                    }
                }
            }
        } catch (err: any) {
            console.error("Submission error:", err);
            showToast(err.response?.data?.error || "Failed to publish listing", "error");
            setIsLoading(false);
        }
    };

    // Render Logic
    let content;

    if (listingData && step === 'confirmation') {
        content = (
            <AirbnbListingConfirmation
                key="confirmation"
                data={listingData}
                onConfirm={handleListingConfirm}
                onCancel={() => setListingData(null)}
                confirmLabel="Next: Set Pricing"
            />
        );
    } else if (step === 'pricing' && listingData) {
        const airbnbPrice = parseInt(String(listingData.pricing?.price || '0').replace(/[^0-9]/g, '') || '0');
        const discountedPrice = listingData.pricing?.discountedPrice ? parseInt(String(listingData.pricing.discountedPrice).replace(/[^0-9]/g, '') || '0') : undefined;

        console.log("DEBUG: Pricing Data:", {
            rawPricing: listingData.pricing,
            airbnbPrice,
            discountedPrice,
            fallbackReason: !airbnbPrice ? "airbnbPrice is 0/falsy" : "None"
        });

        content = (
            <PricingWizard
                key="pricing"
                airbnbPrice={airbnbPrice || 5000}
                currentDiscountedPrice={discountedPrice}
                enableRoomSplitting={listingData.enableRoomSplitting}
                bedroomCount={listingData.bedrooms || 1}
                onNext={handlePricingNext}
                onBack={() => setStep('confirmation')}
            />
        );
    } else if (step === 'photo_sorting' && listingData && pricingData?.enableRoomSplitting) {
        content = (
            <PhotoSortingStep
                photos={listingData.photos.map((img: any) => img.url) || []}
                bedroomCount={listingData.bedrooms || 1}
                onNext={handlePhotoSortingNext}
                onBack={() => setStep('pricing')}
            />
        );
    } else if (step === 'operations') {
        content = (
            <OperationsSetup
                key="operations"
                initialLocation={listingData?.location ? {
                    lat: listingData.location.latitude,
                    lng: listingData.location.longitude
                } : undefined}
                onNext={handleOperationsNext}
                onBack={() => setStep('pricing')}
            />
        );
    } else if (step === 'extras') {
        content = (
            <ExtrasSetup
                key="extras"
                maxGuestCapacity={listingData?.maxGuestCapacity || 2}
                onNext={handleExtrasNext}
                onBack={() => setStep('operations')}
            />
        );
    } else if (step === 'verification') {
        content = (
            <VerificationStep
                key="verification"
                hostId={listingData?.hostDetails?.id || 'unknown'}
                onComplete={handleVerificationComplete}
                draftSaved={draftSaved || (!!legalData && !!legalData.ownershipWarranty?.accepted)}
                initialLegalData={legalData}
                onNavigateToListings={() => {
                    window.history.pushState({}, '', '/hosting/listings');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                onBack={() => setStep('extras')}
            />
        );
    } else {
        content = (
            <div key="import-input" className="min-h-screen bg-gray-50 pb-safe-bottom">
                {/* Header */}
                <div className="pt-[calc(env(safe-area-inset-top)+1rem)] px-5 pb-4 bg-white sticky top-0 z-10 border-b border-gray-100">
                    <div className="flex items-center gap-4 relative z-50">
                        <button
                            onClick={() => onClose ? onClose() : back()}
                            className="w-auto px-4 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-md hover:bg-gray-50 active:bg-gray-100 transition-all relative z-50 gap-2"
                        >
                            <span className="text-xs font-bold text-indigo-500">Exit</span>
                        </button>
                        <div className="text-lg font-bold text-gray-900">
                            {isAuthenticated ? "Add New Property" : "Become a Host"}
                        </div>
                    </div>
                </div>

                <div className="p-5 max-w-md mx-auto">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6"
                    >
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 text-white shadow-lg shadow-indigo-500/30">
                            <LinkIcon size={28} />
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {isAuthenticated ? "Import from Airbnb" : "Start Your Hosting Journey"}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            {isAuthenticated
                                ? "Import your existing Airbnb listing to manage it here. We'll sync your photos and details."
                                : "Paste your Airbnb listing link to get started. We'll import your photos and details instantly. ✨"
                            }
                        </p>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="url"
                                    placeholder="https://airbnb.com/h/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base"
                                />
                                {url && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500"
                                    >
                                        <CheckCircle2 size={20} />
                                    </motion.div>
                                )}
                            </div>

                            <motion.button
                                whileTap={(!url || isLoading) ? {} : { scale: 0.98 }}
                                onClick={handleImport}
                                disabled={!url || isLoading}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-base ${(!url || isLoading)
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                                        : "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:bg-indigo-800"
                                    }`}
                            >
                                {isLoading ? (
                                    <InfinityCheckLoader isLoading={true} size="w-8 h-8" color="white" />
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        {isAuthenticated ? "Import Property" : "Start Import"}
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
                        >
                            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-semibold text-red-900 text-sm">Import Failed</h3>
                                <p className="text-red-700 text-xs mt-1 leading-relaxed">{error}</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Tips */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8"
                    >
                        <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider px-2">
                            {isAuthenticated ? "Why Import?" : "Benefits of Hosting"}
                        </h3>

                        <div className="space-y-3">
                            {[
                                "Save hours of manual entry",
                                "Keep your existing reviews & rating",
                                "Sync your calendar automatically",
                                "Get verified instantly"
                            ].map((tip, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    className="flex items-center gap-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                                >
                                    <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="text-green-600 w-3.5 h-3.5" />
                                    </div>
                                    {tip}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
            <AnimatePresence mode="wait">
                {content}
            </AnimatePresence>
            {toast && (
                <Toast
                    message={toast.message}
                    isVisible={!!toast}
                    type={toast.type}
                    onClose={() => setToast(null)}
                    position="bottom"
                />
            )}


            <ImportGuidanceModal
                isOpen={showGuidanceModal}
                onClose={() => setShowGuidanceModal(false)}
            />

            {showHostModal && hostData && (
                <HostProfileConfirmation
                    hostData={hostData}
                    onConfirm={handleCreateHost}
                    onCancel={() => setShowHostModal(false)}
                />
            )}

            {showInvitationsModal && (
                <CohostInvitationsModal
                    invitations={invitations}
                    onClose={() => {
                        setShowInvitationsModal(false);
                        navigate('/hosting/listings');
                    }}
                />
            )}
        </div>
    );
}
