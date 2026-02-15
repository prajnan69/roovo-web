
import { Medal, Star, ShieldCheck, MessageCircle, Clock } from "lucide-react";

interface HostData {
    name: string;
    image: string | null;
    about: string;
    is_superhost: boolean;
    years_hosting: number;
    months_hosting: number;
    rating_count: number;
    rating_average: number;
    response_rate: string | null;
    response_time: string | null;
}

interface ListingHostInfoProps {
    hostData: HostData;
    isHostKycVerified: boolean;
    isRoovoVerified?: boolean; // New prop for premium badge
}

const ListingHostInfo = ({ hostData, isHostKycVerified, isRoovoVerified }: ListingHostInfoProps) => {
    return (
        <div className="mb-6">
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className="relative">
                        {hostData.image ? (
                            <img
                                src={hostData.image}
                                alt={hostData.name}
                                className="w-14 h-14 rounded-full object-cover border border-slate-100 shadow-sm"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                {hostData.name?.charAt(0) || 'H'}
                            </div>
                        )}
                        {hostData.is_superhost && (
                            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-50">
                                <Medal className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-center">

                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            Hosted by {hostData.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            {hostData.years_hosting > 0 ? (
                                <span>{hostData.years_hosting}y hosting</span>
                            ) : (
                                <span>New Host</span>
                            )}
                            {hostData.is_superhost && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-700 font-medium">Superhost</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Host Stats Row */}
            <div className="flex gap-4 mt-4 overflow-x-auto no-scrollbar">
                {hostData.rating_count > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Star className="w-4 h-4 fill-slate-900 text-slate-900" />
                        <span className="font-semibold">{hostData.rating_count} Reviews</span>
                    </div>
                )}
                {hostData.rating_average > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="font-semibold px-1.5 py-0.5 bg-slate-100 rounded text-xs">
                            {hostData.rating_average} ★
                        </div>
                        <span>Rating</span>
                    </div>
                )}
                {isHostKycVerified && (
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-semibold">Identity Verified</span>
                    </div>
                )}

            </div>

            {/* Host About Snippet */}
            {hostData.about && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-600 text-sm italic line-clamp-3">
                        "{hostData.about}"
                    </p>
                </div>
            )}

            {/* Host Response Details */}
            {(hostData.response_time || hostData.response_rate) && (
                <div className="mt-3 flex gap-4 text-xs text-slate-400">
                    {hostData.response_rate && (
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {hostData.response_rate}</span>
                    )}
                    {hostData.response_time && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {hostData.response_time}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default ListingHostInfo;
