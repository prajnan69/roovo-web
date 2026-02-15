
import MapView from "@/components/Map";

interface ListingMapProps {
    place: string;
    latitude: number;
    longitude: number;
}

const ListingMap = ({ place, latitude, longitude }: ListingMapProps) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Where you'll be</h2>
            <p className="text-slate-500 text-sm mb-4">{place}</p>
            <div className="h-56 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative z-0">
                <MapView latitude={latitude} longitude={longitude} />
            </div>
        </div>
    );
};

export default ListingMap;
