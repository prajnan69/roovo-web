
import { Users, BedDouble, Bath, Home } from "lucide-react";

interface ListingStatsProps {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
}

const ListingStats = ({ maxGuests, bedrooms, bathrooms, propertyType }: ListingStatsProps) => {
    const stats = [
        { icon: Users, label: `${maxGuests} Guests` },
        { icon: BedDouble, label: `${bedrooms} Bedroom${bedrooms !== 1 ? 's' : ''}` },
        { icon: Bath, label: `${bathrooms} Bath${bathrooms !== 1 ? 's' : ''}` },
        { icon: Home, label: propertyType }
    ];

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
