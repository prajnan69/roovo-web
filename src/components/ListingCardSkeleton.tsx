import React from 'react';

const ListingCardSkeleton: React.FC = () => {
    return (
        <div className="w-40 shrink-0 animate-pulse">
            {/* Image Placeholder */}
            <div className="bg-slate-200 rounded-2xl aspect-square w-full" />

            {/* Title & Info Placeholders */}
            <div className="mt-2 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="flex gap-2 items-center mt-1">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-8" />
                </div>
            </div>
        </div>
    );
};

export default ListingCardSkeleton;
