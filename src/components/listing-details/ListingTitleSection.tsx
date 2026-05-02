import { MapPin, Star } from "lucide-react";

interface ListingTitleSectionProps {
    title: string;
    place: string;
    rating: number;
}

const ListingTitleSection = ({ title, place, rating }: ListingTitleSectionProps) => {
    return (
        <div className="mt-2 mb-6">
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2rem', fontWeight: 600, color: '#0A0A09', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 8 }}>
                {title}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">{place}</span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center text-slate-800 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                    {rating}
                </div>
            </div>
        </div>
    );
};

export default ListingTitleSection;
