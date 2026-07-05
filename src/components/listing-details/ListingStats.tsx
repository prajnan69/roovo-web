
import { Users, BedDouble, Bath, Home } from "lucide-react";

interface ListingStatsProps {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
}

const ListingStats = ({ maxGuests, bedrooms, bathrooms, propertyType }: ListingStatsProps) => {
    // Only show facts that actually exist on the listing
    const stats = [
        maxGuests > 0 ? { icon: Users, label: `${maxGuests} Guests` } : null,
        bedrooms > 0 ? { icon: BedDouble, label: `${bedrooms} Bedroom${bedrooms !== 1 ? 's' : ''}` } : null,
        bathrooms > 0 ? { icon: Bath, label: `${bathrooms} Bath${bathrooms !== 1 ? 's' : ''}` } : null,
        propertyType ? { icon: Home, label: propertyType } : null,
    ].filter((s): s is { icon: typeof Users; label: string } => s !== null);

    if (stats.length === 0) return null;

    return (
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2">
            {stats.map((stat, idx) => (
                <div key={idx} className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <stat.icon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{stat.label}</span>
                </div>
            ))}
        </div>
    );
};

export default ListingStats;
