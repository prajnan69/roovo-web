
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Bath, BedDouble, Tv, Wifi, Car, Wind, Sparkles } from "lucide-react";

// --- Icon Helper (moved here or imported) ---
const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('kitchen') || lower.includes('dining')) return <Utensils className="w-5 h-5" />;
    if (lower.includes('bathroom')) return <Bath className="w-5 h-5" />;
    if (lower.includes('bedroom')) return <BedDouble className="w-5 h-5" />;
    if (lower.includes('entertainment')) return <Tv className="w-5 h-5" />;
    if (lower.includes('internet')) return <Wifi className="w-5 h-5" />;
    if (lower.includes('parking')) return <Car className="w-5 h-5" />;
    if (lower.includes('cooling') || lower.includes('heating')) return <Wind className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
};

interface ListingAmenitiesProps {
    amenitiesSections: any[];
    showAll: boolean;
    onToggle: () => void;
    totalAmenitiesCount: number;
}

const ListingAmenities = ({ amenitiesSections, showAll, onToggle, totalAmenitiesCount }: ListingAmenitiesProps) => {
    const visibleSections = showAll ? amenitiesSections : amenitiesSections?.slice(0, 3);

    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">What this place offers</h2>
            <div className="space-y-6">
                <AnimatePresence>
                    {visibleSections?.map((section: any, idx: number) => {
                        const itemsToShow = showAll ? section.items : section.items.slice(0, 4);
                        const hasMoreItems = !showAll && section.items.length > 4;

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                                        {getCategoryIcon(section.category)}
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm">{section.category}</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3 pl-2 border-l-2 border-slate-100 ml-4">
                                    {itemsToShow.map((item: any, i: number) => {
                                        const label = typeof item === 'string' ? item : item.title;
                                        return (
                                            <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                                {label}
                                            </div>
                                        );
                                    })}
                                    {hasMoreItems && (
                                        <div className="text-xs text-slate-400 pl-4 italic">
                                            + {section.items.length - 4} more in this category
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <button
                onClick={onToggle}
                className="w-full mt-6 py-3.5 rounded-xl border border-slate-200 font-semibold text-slate-900 text-sm active:bg-slate-50 transition-colors flex justify-center items-center"
            >
                {showAll ? "Show less" : `Show all ${totalAmenitiesCount} amenities`}
            </button>
        </div>
    );
};

export default ListingAmenities;
