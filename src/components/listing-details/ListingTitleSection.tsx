import { MapPin } from "lucide-react";

interface ListingTitleSectionProps {
    title: string;
    place: string;
    rating?: number;
}

const ListingTitleSection = ({ title, place, rating }: ListingTitleSectionProps) => {
    return (
        <div style={{ marginBottom: 16 }}>
            {/* Serif title — matches prototype's Cormorant Garamond 30px */}
            <div style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: 30,
                fontWeight: 500,
                color: '#0A0A09',
                lineHeight: 1.12,
                letterSpacing: '-0.04em',
                marginBottom: 12,
            }}>
                {title}
            </div>
            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888880', flexWrap: 'wrap' }}>
                <MapPin size={13} color="#888880" strokeWidth={2} />
                <span>{place}</span>
            </div>
        </div>
    );
};

export default ListingTitleSection;
