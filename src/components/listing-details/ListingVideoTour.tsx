
interface ListingVideoTourProps {
    videoUrl: string | null;
    posterUrl: string | null;
}

const ListingVideoTour = ({ videoUrl, posterUrl }: ListingVideoTourProps) => {
    if (!videoUrl) return null;

    return (
        <>
            <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Video Tour</h2>
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 aspect-video shadow-sm border border-slate-100">
                    <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster={posterUrl || undefined}
                        playsInline
                    />
                </div>
            </div>
            <div className="h-px w-full bg-slate-100 mb-8" />
        </>
    );
};

export default ListingVideoTour;
